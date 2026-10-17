/**
 * peerLink: conexión PeerJS con topología estrella.
 *
 *  - Crear sala: `await hostLink(code)` → el peer usa el id 'urb-<code>' y
 *    acepta conexiones entrantes. Cada conexión es un miembro.
 *  - Unirse: `await guestLink(code)` → conecta contra 'urb-<code>'.
 *
 * El transporte se expone como { send(msg), onMessage(fn), onOpen(fn),
 * onLeave(fn), close() }. Los mensajes se reenvían como objetos JSON
 * (PeerJS serializa solo). El anfitrión es el relé: todo lo que llega de un
 * guest se retransmite a los demás con `from` = id del miembro.
 */

import { Peer } from 'peerjs';

// Alfabeto sin caracteres ambiguos (sin I/L/O/0/1) para el código de sala.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LEN = 6;

export function randomCode() {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

const PREFIX = 'urb-';

/** Crea la sala (anfitrión). code opcional; si el id está ocupado, reintenta. */
export function hostLink(code = randomCode(), tries = 4) {
  return new Promise((resolve, reject) => {
    const peer = new Peer(PREFIX + code);
    const conns = new Map(); // peerId → DataConnection (guests conectados)
    const byConn = new Map(); // DataConnection → peerId asignado
    let selfId = 'host';
    let messageHandler = () => {};
    let leaveHandler = () => {};

    const link = {
      isHost: true,
      code,
      send(msg) {
        const data = JSON.stringify(msg);
        for (const conn of conns.values()) {
          if (conn.open) conn.send(data);
        }
      },
      sendTo(peerId, msg) {
        const conn = conns.get(peerId);
        if (conn && conn.open) conn.send(JSON.stringify(msg));
      },
      onMessage(fn) { messageHandler = fn; },
      onLeave(fn) { leaveHandler = fn; },
      /** Devuelve el id de miembro asignado para una conexión entrante. */
      assignId(conn) {
        const id = byConn.get(conn);
        return id ?? null;
      },
      register(conn, memberId) {
        byConn.set(conn, memberId);
        conns.set(memberId, conn);
      },
      removeByConn(conn) {
        const id = byConn.get(conn);
        byConn.delete(conn);
        if (id) conns.delete(id);
        return id ?? null;
      },
      close() {
        for (const conn of conns.values()) { try { conn.close(); } catch { /* ya cerrado */ } }
        peer.destroy();
      },
      peer,
    };

    peer.on('open', () => resolve(link));
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && tries > 0) {
        // el código ya existe: probamos con otro
        try { peer.destroy(); } catch { /* nada */ }
        resolve(hostLink(randomCode(), tries - 1));
      } else {
        reject(err);
      }
    });
    peer.on('connection', (conn) => {
      conn.on('data', (raw) => {
        let msg;
        try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return; }
        const fromId = byConn.get(conn);
        messageHandler(msg, fromId ?? null, conn);
      });
      conn.on('close', () => {
        const id = link.removeByConn(conn);
        if (id) leaveHandler(id);
      });
      conn.on('error', () => {
        const id = link.removeByConn(conn);
        if (id) leaveHandler(id);
      });
    });
  });
}

/** Se une a una sala existente (guest). */
export function guestLink(code) {
  return new Promise((resolve, reject) => {
    const peer = new Peer(); // id aleatorio
    const conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true });
    let messageHandler = () => {};
    let openHandler = () => {};
    let leaveHandler = () => {};
    const timeout = setTimeout(() => {
      try { peer.destroy(); } catch { /* nada */ }
      reject(new Error('sin-respuesta'));
    }, 12000);

    const link = {
      isHost: false,
      code: code.toUpperCase(),
      send(msg) {
        if (conn.open) conn.send(JSON.stringify(msg));
      },
      onMessage(fn) { messageHandler = fn; },
      onOpen(fn) { openHandler = fn; },
      onLeave(fn) { leaveHandler = fn; },
      close() {
        try { conn.close(); } catch { /* nada */ }
        peer.destroy();
      },
      peer,
    };

    conn.on('open', () => {
      clearTimeout(timeout);
      openHandler();
      resolve(link);
    });
    conn.on('data', (raw) => {
      let msg;
      try { msg = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return; }
      messageHandler(msg, 'host', null);
    });
    conn.on('close', () => leaveHandler('host'));
    conn.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    peer.on('error', (err) => {
      clearTimeout(timeout);
      reject(err.type === 'peer-unavailable' ? new Error('no-existe') : err);
    });
  });
}

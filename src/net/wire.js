/**
 * wire: conecta un link (peerLink/PeerJS) con un Room (lógica pura).
 *
 * Extraído de main.js para poder testear el handshake completo headless;
 * la única dependencia de UI son los hooks que inyecta main:
 *
 *   hooks = {
 *     maxPlayers,           // límite de jugadores (GAME_CONFIG.maxPlayers)
 *     toast(msg),           // aviso efímero
 *     onLobbyChange(),      // cambió el lobby (host: re-render si estamos ahí)
 *     onWelcome(msg),       // guest: llegó el welcome (aplicar selfId + mostrar sala)
 *     onHostLost(),         // guest: se cortó la conexión con el anfitrión
 *     onEvent(type, data),  // eventos de Room: 'config' | 'roster' | 'start' | ...
 *   }
 */

/** Cablea un link de anfitrión: hello/want-char son suyos; el resto se relé + se procesa. */
export function wireHost(link, room, hooks) {
  room.send = (msg) => link.send(msg);
  link.onMessage((msg, fromId, conn) => {
    if (!msg || !msg.t) return;
    if (msg.t === 'hello') {
      const humans = room.fighters.filter((f) => f.owner !== 'cpu').length;
      if (room.state !== 'lobby' || humans >= hooks.maxPlayers) {
        conn.send(JSON.stringify({ t: 'closed' }));
        return;
      }
      const id = room.addMember(msg.name || 'Jugador');
      link.register(conn, id);
      // un fighter humano para el nuevo miembro (si hay lugar)
      if (room.fighters.length < hooks.maxPlayers) {
        room.fighters.push({ owner: id, character: 'coco', ai: null });
      }
      conn.send(JSON.stringify(room.welcomeFor(id, msg.name)));
      room.send({ t: 'roster', members: room.members });
      room.broadcastConfig();
      hooks.onLobbyChange?.();
      return;
    }
    if (msg.t === 'want-char') {
      const fg = room.fighters[msg.fighterIdx];
      if (room.state === 'lobby' && fg && fg.owner === fromId) {
        room.fighters[msg.fighterIdx] = { ...fg, character: msg.character };
        room.broadcastConfig();
      }
      return;
    }
    // el resto: procesar localmente + relé a los demás
    room.receive(msg, fromId);
    for (const m of room.members) {
      if (m.id !== fromId) link.sendTo(m.id, { ...msg, from: fromId });
    }
  });
  link.onLeave((id) => {
    const member = room.members.find((m) => m.id === id);
    // índices de los fighters que controlaba (antes de removerlo)
    const idxs = room.fighters.map((f, i) => (f.owner === id ? i : -1)).filter((i) => i >= 0);
    room.removeMember(id);
    if (room.state === 'lobby') {
      room.fighters = room.fighters.filter((f) => f.owner !== id);
      room.broadcastConfig();
      hooks.onLobbyChange?.();
    }
    room.send({ t: 'roster', members: room.members });
    room.send({ t: 'leave', i: idxs, f: room.frame, name: member?.name ?? id });
    hooks.toast?.('Alguien se desconectó');
  });
  room.onEvent = hooks.onEvent ?? (() => {});
}

/** Cablea un link de guest: todo llega del host (con from explícito). */
export function wireGuest(link, room, hooks) {
  room.send = (msg) => link.send(msg);
  link.onMessage((msg) => {
    if (!msg || !msg.t) return;
    if (msg.t === 'welcome') {
      room.selfId = msg.selfId;
      room.members = msg.members;
      room.fighters = msg.fighters;
      room.stageId = msg.stageId;
      room.stocks = msg.stocks;
      hooks.onWelcome?.(msg);
      return;
    }
    room.receive(msg, msg.from ?? 'host');
  });
  link.onLeave(() => {
    hooks.toast?.('Se cortó la conexión con el anfitrión');
    hooks.onHostLost?.();
  });
  room.onEvent = hooks.onEvent ?? (() => {});
}

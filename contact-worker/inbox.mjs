// Private operational inbox, deliberately separate from anonymous event counters.
export async function storeRequest(db, { name, email, message }) {
  const result = await db.prepare(`INSERT INTO contact_requests (id, received_at, name, email, message)
    SELECT ?1, ?2, ?3, ?4, ?5 WHERE (SELECT COUNT(*) FROM contact_requests) < 1000`)
    .bind(crypto.randomUUID(), new Date().toISOString(), name.trim(), email, message.trim()).run();
  if (!result.success || result.meta.changes !== 1) throw new Error('Inbox unavailable');
}

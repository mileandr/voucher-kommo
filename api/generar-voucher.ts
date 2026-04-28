export default async function handler(req, res) {
  console.log("WEBHOOK RECIBIDO");

  const leadId =
    req.body?.leads?.update?.[0]?.id ||
    req.body?.leads?.add?.[0]?.id;

  if (!leadId) {
    return res.json({ ok: false, error: "No leadId" });
  }

  const leadRes = await fetch(
    `${process.env.KOMMO_BASE_URL}/api/v4/leads/${leadId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.KOMMO_TOKEN}`,
      },
    }
  );

  const lead = await leadRes.json();

  if (lead.status_id !== 142) {
    return res.json({ ok: true, ignored: true });
  }

  const mensaje = `
VOUCHER GENERADO 🚀

Lead: ${lead.name}
ID: ${lead.id}
`;

  await fetch(`${process.env.KOMMO_BASE_URL}/api/v4/leads/notes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KOMMO_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        entity_id: leadId,
        note_type: "common",
        params: {
          text: mensaje,
        },
      },
    ]),
  });

  return res.json({
    ok: true,
    message: "Voucher enviado",
  });
}

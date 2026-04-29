export default async function handler(req, res) {
  console.log("WEBHOOK RECIBIDO");

  const leadId =
    req.body?.leads?.update?.[0]?.id ||
    req.body?.leads?.add?.[0]?.id ||
    req.body?.["leads[update][0][id]"] ||
    req.body?.["leads[add][0][id]"];

  if (!leadId) {
    return res.json({ ok: false, error: "No leadId" });
  }

  const KOMMO_BASE_URL = process.env.KOMMO_BASE_URL;
  const KOMMO_TOKEN = process.env.KOMMO_TOKEN;

  async function kommo(endpoint, options = {}) {
    const response = await fetch(`${KOMMO_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${KOMMO_TOKEN}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.log("ERROR KOMMO:", response.status, data);
      throw new Error(JSON.stringify(data));
    }

    return data;
  }

  async function crearNota(texto) {
    return kommo("/api/v4/leads/notes", {
      method: "POST",
      body: JSON.stringify([
        {
          entity_id: Number(leadId),
          note_type: "common",
          params: {
            text: texto
          }
        }
      ])
    });
  }

  try {
    const lead = await kommo(`/api/v4/leads/${leadId}`);

    console.log("LEAD:", {
      id: lead.id,
      name: lead.name,
      status_id: lead.status_id,
      pipeline_id: lead.pipeline_id
    });

    // Ganado en Kommo normalmente es 142
    if (Number(lead.status_id) !== 142) {
      return res.json({
        ok: true,
        ignored: true,
        reason: "El lead no está en ganado",
        status_id: lead.status_id
      });
    }

    // 1. Voucher por hacer
    await crearNota(`
VOUCHER POR HACER

Lead: ${lead.name}
ID: ${lead.id}

El lead llegó a ganados. Se inicia proceso de voucher.
`);

    // 2. Aquí iría la generación real del voucher/PDF
    const voucherTexto = `
Voucher generado para:
Cliente: ${lead.name}
ID Lead: ${lead.id}
Fecha: ${new Date().toLocaleString("es-EC")}
`;

    console.log("VOUCHER GENERADO:", voucherTexto);

    // 3. Voucher hecho
    await crearNota(`
VOUCHER HECHO

Lead: ${lead.name}
ID: ${lead.id}

El voucher fue generado correctamente.
`);

    // 4. Voucher enviado
    // Por ahora queda como nota. Luego aquí conectamos el envío real por WhatsApp/Salesbot.
    await crearNota(`
VOUCHER ENVIADO

Lead: ${lead.name}
ID: ${lead.id}

El voucher fue marcado como enviado.
`);

    return res.json({
      ok: true,
      message: "Proceso de voucher completado",
      leadId: lead.id,
      leadName: lead.name,
      status_id: lead.status_id
    });
  } catch (error) {
    console.error("ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}

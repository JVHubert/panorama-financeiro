// Entrega o relatório no canal configurado: Telegram primeiro, ntfy depois, senão imprime na tela.
// Telegram: defina TELEGRAM_TOKEN e TELEGRAM_CHAT_ID (ver README).
// ntfy: defina NTFY_TOPIC (opcional: NTFY_SERVER, NTFY_TOKEN).
import { podeMostrarDetalhe } from '../indicadores.js';

const LIMITE_TELEGRAM = 4000;

export async function enviar(texto, { titulo = 'Panorama Financeiro' } = {}) {
  const token = process.env.TELEGRAM_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (token && chat) return enviarTelegram(texto, { token, chat });

  const topico = process.env.NTFY_TOPIC;
  if (topico) return enviarNtfy(texto, { titulo, topico });

  // Sem canal configurado, o texto iria para o log — no GitHub (log público) ele fica de fora.
  if (podeMostrarDetalhe(process.env)) console.log(texto);
  return { canal: 'tela' };
}

// Alerta da automação: texto simples (sem <pre>) para o link ficar clicável no Telegram.
// Nunca derruba quem chamou — um alerta que falha não pode virar um segundo problema.
export async function enviarAlerta(texto, { titulo = 'Panorama Financeiro - alerta' } = {}) {
  const token = process.env.TELEGRAM_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  try {
    // Desde 19/10/2026 o JV11 orquestra as mensagens: o alerta fica guardado na Cloudflare e aparece
    // na mensagem do dia ("saúde dos dois"), em vez de chegar sozinho no Telegram.
    if (process.env.ALERTAS_URL && process.env.ALERTAS_SEGREDO) {
      const resposta = await fetch(process.env.ALERTAS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-segredo': process.env.ALERTAS_SEGREDO },
        body: JSON.stringify({ origem: 'Panorama', texto }),
      });
      if (!resposta.ok) throw new Error(`o JV11 recusou o alerta (${resposta.status})`);
      return { canal: 'jv11' };
    }
    if (token && chat) {
      const resposta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: texto, disable_web_page_preview: true }),
      });
      const devolvido = await resposta.json().catch(() => ({}));
      if (!resposta.ok || devolvido.ok === false) {
        throw new Error(`Telegram recusou (${resposta.status}): ${devolvido.description ?? 'sem detalhe'}`);
      }
      return { canal: 'telegram' };
    }
    const topico = process.env.NTFY_TOPIC;
    if (topico) return await enviarNtfy(texto, { titulo, topico });
    console.log(texto);
    return { canal: 'tela' };
  } catch (erro) {
    console.log(`::warning::o alerta não foi entregue (${erro.message})`);
    return { canal: 'erro', erro: erro.message };
  }
}

// O relatório é uma tabela de texto: dentro de <pre> o Telegram usa fonte monoespaçada
// e as colunas ficam alinhadas. (Telegram não aceita cor em texto — a cor é o emoji.)
function escaparHtml(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function enviarTelegram(texto, { token, chat }) {
  const cortado =
    texto.length > LIMITE_TELEGRAM
      ? `${texto.slice(0, LIMITE_TELEGRAM)}\n\n[relatório cortado, o completo está em relatorios/]`
      : texto;
  const resposta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chat,
      text: `<pre>${escaparHtml(cortado)}</pre>`,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const devolvido = await resposta.json().catch(() => ({}));
  if (!resposta.ok || devolvido.ok === false) {
    throw new Error(`Telegram recusou (${resposta.status}): ${devolvido.description ?? 'sem detalhe'}`);
  }
  return { canal: 'telegram' };
}

async function enviarNtfy(texto, { titulo, topico }) {
  const servidor = (process.env.NTFY_SERVER ?? 'https://ntfy.sh').replace(/\/+$/, '');
  const cabecalhos = {
    // Cabeçalho HTTP não aceita acento.
    Title: titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  };
  if (process.env.NTFY_TOKEN) cabecalhos.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
  const resposta = await fetch(`${servidor}/${topico}`, {
    method: 'POST',
    headers: cabecalhos,
    body: texto,
  });
  if (!resposta.ok) throw new Error(`ntfy recusou (${resposta.status})`);
  return { canal: 'ntfy' };
}

// A imagem é o canal principal (cor de verdade); o texto fica como reserva.
export async function enviarFoto(png, { legenda = 'Relatório semanal' } = {}) {
  const token = process.env.TELEGRAM_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return null;

  const formulario = new FormData();
  formulario.append('chat_id', chat);
  formulario.append('caption', legenda);
  formulario.append('photo', new Blob([png], { type: 'image/png' }), 'relatorio.png');

  const resposta = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    body: formulario,
  });
  const devolvido = await resposta.json().catch(() => ({}));
  if (!resposta.ok || devolvido.ok === false) {
    throw new Error(`Telegram recusou a foto (${resposta.status}): ${devolvido.description ?? 'sem detalhe'}`);
  }
  return { canal: 'telegram-foto' };
}

// O relatório já ficou salvo em relatorios/, então falha de envio não derruba o trabalho.
export async function enviarSemDerrubar(texto, opcoes = {}) {
  try {
    const resultado = await enviar(texto, opcoes);
    console.log(`relatório enviado por ${resultado.canal}`);
    return resultado;
  } catch (erro) {
    console.log(`::warning::falha ao enviar (${erro.message}) — o texto ficou salvo em relatorios/`);
    if (podeMostrarDetalhe(process.env)) console.log(texto);
    return { canal: 'erro', erro: erro.message };
  }
}

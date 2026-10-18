// Último passo de todo workflow: avisa no Telegram que ele falhou, onde parou e o que costuma ser.
// Uso nos workflows (passo com `if: failure()`):
//   node tools/alertar.mjs
//   node tools/alertar.mjs --aviso "<passo>" "<consequência>"   (passo que falhou sem derrubar o resto)
// Precisa de GITHUB_TOKEN com `actions: read` para descobrir o passo que falhou.
import { mensagemDeAviso, mensagemDeFalha } from '../alertas.js';
import { enviarAlerta } from './notificar.mjs';

const {
  GITHUB_API_URL = 'https://api.github.com',
  GITHUB_SERVER_URL = 'https://github.com',
  GITHUB_REPOSITORY,
  GITHUB_RUN_ID,
  GITHUB_WORKFLOW = 'workflow',
  GITHUB_TOKEN,
} = process.env;

const link = GITHUB_REPOSITORY && GITHUB_RUN_ID
  ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
  : '';

// O passo que falhou, pela API do GitHub. Sem permissão ou sem rede, segue sem ele.
async function passoQueFalhou() {
  if (!GITHUB_REPOSITORY || !GITHUB_RUN_ID || !GITHUB_TOKEN) return '';
  try {
    const resposta = await fetch(
      `${GITHUB_API_URL}/repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/jobs`,
      { headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: 'application/vnd.github+json' } },
    );
    if (!resposta.ok) return '';
    const { jobs = [] } = await resposta.json();
    for (const job of jobs) {
      const passo = (job.steps ?? []).find((item) => item.conclusion === 'failure');
      if (passo) return passo.name;
      if (job.conclusion === 'failure') return `job "${job.name}"`;
    }
  } catch {
    // Sem o nome do passo, o alerta ainda sai com o link.
  }
  return '';
}

const [, , modo, passoDoAviso, consequencia] = process.argv;

const texto =
  modo === '--aviso'
    ? mensagemDeAviso({ workflow: GITHUB_WORKFLOW, passo: passoDoAviso, consequencia, link })
    : mensagemDeFalha({ workflow: GITHUB_WORKFLOW, passo: await passoQueFalhou(), link });

const { canal } = await enviarAlerta(texto);
console.log(`alerta enviado por ${canal}`);

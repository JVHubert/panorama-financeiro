import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VIGIADOS,
  alertasNovos,
  atrasoDoWorkflow,
  dicaDoPasso,
  mensagemDeAtraso,
  mensagemDeAviso,
  mensagemDeFalha,
  ultimoDomingoDoRelatorio,
} from '../alertas.js';

const atualizar = VIGIADOS.find((item) => item.arquivo === 'atualizar.yml');
const semanal = VIGIADOS.find((item) => item.arquivo === 'semanal.yml');
const execucao = (quando, conclusion = 'success') => ({ created_at: quando, conclusion });

test('cada passo dos workflows ganha a dica certa', () => {
  assert.match(dicaDoPasso('Buscar os indicadores'), /Banco Central/);
  assert.match(dicaDoPasso('Atualizar os indicadores'), /Banco Central/);
  assert.match(dicaDoPasso('Ler o que chegou no Telegram'), /Telegram/);
  assert.match(dicaDoPasso('Guardar no repositório privado'), /DADOS_TOKEN/);
  assert.match(dicaDoPasso('Trazer os dados privados, quando o token existir'), /DADOS_TOKEN/);
  assert.match(dicaDoPasso('Conferir as contas'), /testes/);
  assert.match(dicaDoPasso('Montar e enviar o relatório'), /relatório/);
  assert.match(dicaDoPasso('Publicar o novo JSON'), /indicadores novos/);
  assert.match(dicaDoPasso('Montar o site'), /site/);
  assert.match(dicaDoPasso('actions/deploy-pages@v4'), /site/);
  assert.match(dicaDoPasso('Instalar as dependências'), /ambiente/);
  assert.equal(dicaDoPasso('passo que ninguém conhece'), 'erro inesperado.');
  assert.equal(dicaDoPasso(undefined), 'erro inesperado.');
});

test('a mensagem de falha diz o workflow, o passo, a dica e o link', () => {
  const texto = mensagemDeFalha({
    workflow: 'Atualizar indicadores',
    passo: 'Buscar os indicadores',
    link: 'https://github.com/JVHubert/x/actions/runs/1',
  });
  assert.match(texto, /^⚠️ Falhou: Atualizar indicadores/);
  assert.match(texto, /Onde parou: Buscar os indicadores/);
  assert.match(texto, /Banco Central/);
  assert.match(texto, /Detalhes: https:\/\/github\.com\/JVHubert\/x\/actions\/runs\/1$/);
});

test('sem o nome do passo, a mensagem de falha ainda sai com o link', () => {
  const texto = mensagemDeFalha({ workflow: 'Telegram', passo: '', link: 'https://x' });
  assert.match(texto, /não consegui descobrir o passo/);
  assert.match(texto, /erro inesperado/);
  assert.match(texto, /Detalhes: https:\/\/x/);
});

test('o aviso diz que rodou, mas com problema, e a consequência', () => {
  const texto = mensagemDeAviso({
    workflow: 'Relatório semanal',
    passo: 'Atualizar os indicadores',
    consequencia: 'O relatório saiu com os indicadores da última coleta que deu certo.',
    link: 'https://x',
  });
  assert.match(texto, /Relatório semanal rodou, mas com um problema/);
  assert.match(texto, /Banco Central/);
  assert.match(texto, /última coleta/);
});

test('o domingo do relatório é o das 18h de Brasília mais recente que já passou', () => {
  // Domingo, 18/10/2026: antes das 21h UTC ainda vale o domingo anterior.
  assert.equal(new Date(ultimoDomingoDoRelatorio('2026-10-18T20:59:00Z')).toISOString(), '2026-10-11T21:00:00.000Z');
  assert.equal(new Date(ultimoDomingoDoRelatorio('2026-10-18T21:00:00Z')).toISOString(), '2026-10-18T21:00:00.000Z');
  // Quarta-feira: o último domingo.
  assert.equal(new Date(ultimoDomingoDoRelatorio('2026-10-21T12:00:00Z')).toISOString(), '2026-10-18T21:00:00.000Z');
});

test('o relatório só é cobrado 5 h depois das 18h de domingo', () => {
  const semRodar = [execucao('2026-10-11T21:30:00Z')];
  assert.equal(atrasoDoWorkflow(semanal, semRodar, '2026-10-19T01:59:00Z'), null);
  const atraso = atrasoDoWorkflow(semanal, semRodar, '2026-10-19T02:00:00Z');
  assert.equal(atraso.chave, 'semanal.yml:2026-10-18');
  assert.match(atraso.motivo, /domingo/);
});

test('o relatório que rodou (agendado, atrasado ou à mão) não gera alerta', () => {
  const agora = '2026-10-20T12:00:00Z';
  assert.equal(atrasoDoWorkflow(semanal, [execucao('2026-10-18T23:40:00Z')], agora), null);
  assert.equal(atrasoDoWorkflow(semanal, [execucao('2026-10-18T20:10:00Z')], agora), null);
  // Falhou e ninguém rodou de novo: atraso (o alerta de falha já saiu, este lembra que segue sem relatório).
  assert.ok(atrasoDoWorkflow(semanal, [execucao('2026-10-18T21:20:00Z', 'failure')], agora));
});

test('a coleta é cobrada depois de 30 h sem dar certo', () => {
  const ultimo = execucao('2026-10-17T23:01:00Z');
  assert.equal(atrasoDoWorkflow(atualizar, [ultimo], '2026-10-19T05:00:00Z'), null);
  const atraso = atrasoDoWorkflow(atualizar, [execucao('2026-10-18T15:47:00Z', 'failure'), ultimo], '2026-10-19T06:00:00Z');
  assert.equal(atraso.chave, 'atualizar.yml:2026-10-19');
  assert.match(atraso.motivo, /30 h/);
  assert.equal(atraso.ultimoSucesso, Date.parse('2026-10-17T23:01:00Z'));
});

test('sem nenhuma execução que deu certo, o atraso ainda é avisado', () => {
  const atraso = atrasoDoWorkflow(atualizar, [], '2026-10-19T06:00:00Z');
  assert.ok(atraso);
  assert.match(mensagemDeAtraso(atraso, { repositorio: 'JVHubert/x' }), /Não achei nenhuma execução/);
});

test('a mensagem de atraso leva ao workflow e diz quando deu certo pela última vez', () => {
  const atraso = atrasoDoWorkflow(atualizar, [execucao('2026-10-17T23:01:00Z')], '2026-10-19T06:00:00Z');
  const texto = mensagemDeAtraso(atraso, { repositorio: 'JVHubert/x' });
  assert.match(texto, /^⚠️ Não rodou: Atualizar indicadores/);
  assert.match(texto, /Última vez que deu certo: 17\/10, 20:01/);
  assert.match(texto, /Run workflow/);
  assert.match(texto, /https:\/\/github\.com\/JVHubert\/x\/actions\/workflows\/atualizar\.yml/);
});

test('cada problema é avisado uma vez só, e o registro esquece o que tem mais de 30 dias', () => {
  const atraso = { chave: 'semanal.yml:2026-10-18' };
  const agora = Date.parse('2026-10-19T03:00:00Z');

  const primeira = alertasNovos([atraso], {}, agora);
  assert.equal(primeira.novos.length, 1);

  const segunda = alertasNovos([atraso], primeira.registro, agora + 3600000);
  assert.equal(segunda.novos.length, 0);

  const antigo = { 'atualizar.yml:2026-08-01': '2026-08-01T10:00:00.000Z' };
  const podado = alertasNovos([], antigo, agora);
  assert.deepEqual(podado.registro, {});
});

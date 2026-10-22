# linkedin-bot (automacao-v3)

Bot de LinkedIn em **NestJS + Playwright** que procura **posts de vaga** e aborda quem postou:

1. busca posts com termos como *"hiring node.js developer remote LATAM"*;
2. lê cada post e decide se vale a pena (stack **JS/TS/Node/Nest**, **remoto aberto pro Brasil/LATAM** ou **relocation**);
3. copia o link do post, abre o perfil do autor e manda **conexão sem nota**;
4. manda a **mensagem** com o link do post. Se não der na hora (sem crédito de InMail), manda depois que a pessoa aceitar a conexão.

Um post por vez, com **limite por dia e por hora**, ritmo humano, e **para sozinho** se o LinkedIn mostrar bloqueio (busca pausada, checkpoint, login, limite de convites).

---

## Sumário

- [Requisitos](#requisitos)
- [Rodando com Docker (recomendado)](#rodando-com-docker-recomendado)
- [Rodando local (sem Docker)](#rodando-local-sem-docker)
- [Configuração (.env)](#configuração-env)
- [Usando o bot (API)](#usando-o-bot-api)
- [O que o bot aborda e o que ele pula](#o-que-o-bot-aborda-e-o-que-ele-pula)
- [A mensagem](#a-mensagem)
- [Problemas comuns](#problemas-comuns)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Testes](#testes)

---

## Requisitos

| Jeito | Precisa de |
|---|---|
| Docker | Docker + Docker Compose (no Windows/WSL: Docker Desktop com a integração WSL ligada) |
| Local | Node.js 22+ e npm. No Linux/WSL, um ambiente com janela (WSLg funciona) |

E uma conta do LinkedIn. O login é feito **na mão, uma vez**: o perfil do Chrome fica salvo em `data/chrome-profile` e das próximas vezes ele já abre logado.

> ⚠️ **Uma sessão por conta.** Não rode este bot ao mesmo tempo que outro bot/navegador automatizado na mesma conta: o LinkedIn derruba o login.

---

## Rodando com Docker (recomendado)

O Chrome roda dentro do container numa **tela virtual** que você abre pelo navegador (noVNC). É por ela que você faz o login e acompanha o que o bot está fazendo.

> Os arquivos de Docker ainda não foram testados num build real. Se algo falhar no `docker compose up --build`, abra uma issue com o erro.

**1. Configurar**

```bash
cp .env.example .env
```

Abra o `.env` e ajuste pelo menos (veja [Configuração](#configuração-env)):

```bash
BOT_AUTO_RUN=false     # deixe desligado até testar
BOT_AUTO_LIVE=false
VNC_PASSWORD=uma-senha # senha da tela do Chrome
```

**2. Subir**

```bash
docker compose up -d --build
docker compose logs -f     # acompanhar (Ctrl+C sai só do log)
```

**3. Fazer o login no LinkedIn (só na primeira vez)**

```bash
curl localhost:3999/browser/login
```

Abra **http://localhost:6080/vnc.html**, conecte (com a `VNC_PASSWORD`) e faça o login na janela do Chrome que apareceu. A chamada acima responde `true` quando chegar no feed.

**4. Testar em dry-run** (faz tudo menos convidar e mandar mensagem)

```bash
curl -X POST localhost:3999/run
curl localhost:3999/status
```

**5. Rodar de verdade**

```bash
curl -X POST "localhost:3999/run?live=true&max=1"   # 1 abordagem pra conferir
```

Gostou? Liga o automático no `.env` (`BOT_AUTO_RUN=true`, `BOT_AUTO_LIVE=true`) e reinicia:

```bash
docker compose up -d
```

**Parar / ver / reiniciar**

```bash
docker compose stop          # para
docker compose start         # volta
docker compose restart       # depois de mudar o .env
docker compose down          # remove o container (os dados ficam em ./data)
```

Tudo que importa fica em `./data` (banco, login do Chrome, logs, prints de erro). Apagar essa pasta = começar do zero (inclusive o login e o histórico de quem já foi abordado).

---

## Rodando local (sem Docker)

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run build
npm run start:prod            # ou: npm run start:dev (recarrega ao salvar)
```

Depois siga os passos 3 a 5 do Docker (o Chrome abre direto na sua tela, sem noVNC).

Pra deixar rodando em segundo plano (Linux/WSL), mesmo fechando o terminal:

```bash
setsid nohup node dist/main.js >> data/logs/bot.log 2>&1 &
tail -f data/logs/bot.log
kill $(pgrep -f "node dist/main.js")   # parar
```

**Veio do bot antigo (`automacao-v2`)?** Importe o histórico pra não abordar ninguém de novo (pode rodar mais de uma vez, não duplica):

```bash
npm run import:legacy -- ~/automacao-v2/outreach.json
```

---

## Configuração (.env)

Tudo é opcional: sem `.env`, o bot usa os padrões abaixo. Mudou o `.env`? Reinicie o bot.

| Variável | Padrão | O que faz |
|---|---|---|
| `PORT` | `3999` | porta da API |
| `BOT_DB_PATH` | `data/bot.sqlite` | banco (quem já foi abordado e quando) |
| `BOT_CHROME_PROFILE` | `data/chrome-profile` | perfil do Chrome (onde fica o login) |
| `BOT_LIMIT_PER_DAY` | `20` | máximo de abordagens novas por dia |
| `BOT_LIMIT_PER_HOUR` | `6` | máximo por hora |
| `BOT_PACE` | `1` | ritmo das pausas: `1.5` = mais calmo, `0.8` = mais rápido |
| `BOT_TERMS_PER_RUN` | `2` | quantos termos de busca por rodada |
| `BOT_SEARCH_TERMS` | (lista focada em Node/TS remoto/relocation) | termos próprios, separados por `\|` |
| `BOT_YEARS_OF_EXPERIENCE` | `5` | anos que aparecem na mensagem |
| `BOT_AUTO_RUN` | `false` | liga as rodadas automáticas |
| `BOT_AUTO_EVERY_MIN` | `90` | intervalo médio entre rodadas (varia ±25%) |
| `BOT_AUTO_HOURS` | `9-19` | só roda nesse horário (hora do Brasil) |
| `BOT_AUTO_MAX_PER_RUN` | `4` | abordagens novas por rodada automática |
| `BOT_AUTO_LIVE` | `false` | `true` = de verdade; `false` = só simula (dry-run) |
| `VNC_PASSWORD` | vazio | (Docker) senha da tela do Chrome em `localhost:6080` |

> Os limites valem **por cima de tudo**: mesmo com o automático ligado, ele para ao chegar em `BOT_LIMIT_PER_DAY`. O bloqueio de busca que tivemos em 21/10/2026 veio de ~90 abordagens em 2 dias sem teto, então não suba muito esses números.

---

## Usando o bot (API)

| Rota | O que faz |
|---|---|
| `GET /status` | estado (`idle`/`running`/`blocked`), uso do dia/hora, limites, totais, automático, últimas linhas do log |
| `GET /recent?limit=10` | últimas abordagens (nome, link do post, status) |
| `GET /browser/login` | abre o Chrome e espera o login (devolve `true` quando logado) |
| `POST /run` | começa uma rodada em **dry-run** |
| `POST /run?live=true&max=N` | rodada de verdade, no máximo N abordagens novas |
| `POST /stop` | termina o post atual e para a rodada |
| `POST /auto/on` · `POST /auto/off` | liga/desliga o automático sem reiniciar (não muda o `.env`) |
| `POST /unblock` | libera depois de um bloqueio — **confira a conta antes** |
| `POST /debug/message?profile=URL` | abre o perfil, clica em "Message", tira print e fecha (não digita nada) |

Exemplos:

```bash
curl localhost:3999/status | python3 -m json.tool
curl "localhost:3999/recent?limit=5"
curl -X POST localhost:3999/auto/off
```

---

## O que o bot aborda e o que ele pula

**Aborda** posts de vaga que:

- citam **Node, Nest, TypeScript, JavaScript ou Express**; e
- são **remotos abertos pro Brasil/LATAM**, ou **100% remotos sem restrição** (*anywhere*, *worldwide*, *fully remote*); ou
- oferecem **relocation / visa sponsorship** explicitamente.

**Pula**:

| Motivo | Exemplo |
|---|---|
| empresa/grupo ou conta de marca | "RemoteYeah", "Remote Kraft" |
| open to work / quem procura emprego ou indica alguém | "She's looking for roles… I'd love an intro" |
| bench sales / C2C / hotlist | "28 consultants available" |
| fora da stack | vaga de Java, .NET, React puro |
| só local | US citizen, green card, W2, "no sponsorship" |
| remoto só pra outro país | "Remote (US only)", "Remote - India" |
| sem remoto nem relocation | vaga presencial |
| já abordado | qualquer pessoa que já está no banco |

As regras estão em `src/posts/post-classifier.ts` e os casos reais testados em `post-classifier.spec.ts`. Achou um post que deveria passar (ou não)? Adicione o texto no teste e ajuste a regra.

---

## A mensagem

Vaga remota:

```
Hi Natalia, how are you?

I'm (SEU NOME), a Senior Backend Engineer (Node.js, NestJS, TypeScript) based in Brazil. I saw your post about the Senior Full Stack Developer role (https://lnkd.in/p/...) and I'm really interested. I have 5+ years building backend systems and I'm used to working remotely with international teams.

Would you be open to a quick call to talk about it?
```

Vaga com relocation: o final vira *"…and I'm open to relocating."*. Sem cargo reconhecido: *"I saw your recent hiring post (link)…"*.

O texto fica em `src/posts/message.ts` (e o teste em `message.spec.ts`).

**Como ela é enviada:**

- **conexão sempre sem nota**;
- mensagem pelo botão *Message* do perfil, com o *Subject* vazio, digitada como pessoa e **conferida antes de enviar** (se o texto na caixa não bater, não envia);
- quem ainda não é conexão precisa de **InMail**. Sem crédito, o bot só manda a conexão e, nas rodadas seguintes, confere quem aceitou (no máximo a cada 6h por pessoa) e manda a mensagem.

---

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `status: blocked` com "busca pausada" | o LinkedIn pausou a busca da conta. Espere algumas horas/1 dia, diminua os limites e chame `POST /unblock` |
| `blocked` com "checkpoint" ou "sessão caiu" | abra a tela (noVNC ou a janela do Chrome), resolva o login/verificação, chame `GET /browser/login` e `POST /unblock` |
| "mensagem: no-credits" | acabaram os créditos de InMail. Normal: a mensagem vai depois do aceite |
| "mensagem: no-box" / "text-mismatch" | a janela de mensagem não abriu ou o texto não bateu. Veja o print em `data/debug/` |
| "convite: no-button" | o perfil só tem *Follow* (sem *Connect*). O bot recarrega e tenta 1x; se continuar, pula |
| Chrome não abre no Docker ("profile in use") | o container caiu com o Chrome aberto. Reinicie: o entrypoint limpa a trava |
| Nada acontece no automático | confira `GET /status` → `auto.enabled`, `auto.nextRun` e o horário (`BOT_AUTO_HOURS`) |

Logs: `docker compose logs -f` (Docker) ou `data/logs/bot.log` (local). Prints de erro: `data/debug/`.

---

## Estrutura do projeto

```
src/
  config/     .env → BotConfig (limites, termos, ritmo, automático)
  browser/    Chrome com perfil persistente + 2ª aba pros perfis
  posts/      busca, leitura dos cards, classificador, cargo do post, mensagem
  linkedin/   ações na tela: copiar link do post, conectar, mandar mensagem
  limits/     limite por dia/hora + detector de bloqueio
  store/      SQLite (quem já foi abordado e quando) + import do bot antigo
  outreach/   orquestrador da rodada, agendador e API de controle
scripts/      import do histórico do bot antigo
docker/       entrypoint (tela virtual + noVNC + app)
data/         banco, perfil do Chrome, logs e prints (fora do git)
```

---

## Testes

```bash
npx jest
```

Tudo roda **offline**, sem abrir o LinkedIn. A leitura dos cards (`post-cards.spec.ts`) usa um HTML de busca real salvo em `data/fixtures/posts-search.html`, que fica fora do git porque tem dados de outras pessoas. Sem esse arquivo, só esse teste falha.

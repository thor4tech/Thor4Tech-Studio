# Growth Agent — crescimento de perfil pelo Método Audience

Sistema de crescimento de perfil no Instagram/TikTok construído a partir da
engenharia reversa do método de **Elias Maman** (@elias.maman, ~1M seguidores /
Core Educação), extraído de material público.

Desenhado para **replicação**: a brain é universal, o estado é por perfil. Cada
novo perfil é um diretório, não um fork.

---

## O que tem aqui

```
growth-agent/
├── brain/                  # Conhecimento do método (universal, ~57KB, 8 arquivos)
│   ├── 00-INDEX.md              convenção de confiança [V]/[D]/[I]
│   ├── 01-metodo-audience.md    viabilidade + as 7 etapas
│   ├── 02-ganchos-e-headlines.md técnicas de gancho + critério de aceite
│   ├── 03-roteiro-e-producao.md  frase-corrente, lote, escada de autonomia
│   ├── 04-metricas-e-diagnostico.md KPIs-alvo + árvore de decisão
│   ├── 05-monetizacao.md         Demanda/Desejo/Conversão, Efeito da Árvore
│   ├── 06-cases-e-benchmarks.md  curvas reais para calibrar expectativa
│   └── 07-fontes-e-confianca.md  procedência e lacunas
├── agent/
│   ├── SKILL.md            # O agente: 4 modos
│   └── schemas/            # Contratos de dados
├── data/
│   ├── perfis/<perfil>/    # Estado por perfil
│   └── raw/                # Transcrições-fonte
└── tools/extract.sh        # Pipeline de extração (reexecutável)
```

---

## A tese em uma frase

> "Quem tem audiência vende sem esforço."

E o diagnóstico que a sustenta: o gargalo do bom profissional não é competência,
é **empacotamento**. Num mundo de 3 segundos, conhecimento sem embalagem não
circula.

O que o agente automatiza é uma divisão de trabalho que o próprio criador do
método descreve:

> "Eu dei as headline, eu tô criando os ganchos. O que ela fala nos primeiros
> segundos sou eu que tô criando. (...) Mas o conteúdo, a densidade das
> informações, a qualidade das informações é mérito do seu estudo."

**O agente entrega embalagem. O especialista entrega densidade técnica.**
O agente nunca inventa fato técnico — onde entraria conteúdo, ele emite um
briefing. Num perfil de autoridade, um dado alucinado destrói o ativo que o
perfil inteiro existe para construir.

---

## Teste de viabilidade — antes de qualquer coisa

O método declara três ingredientes, e depende dos três:

| # | Ingrediente | Critério |
|---|---|---|
| 1 | **Mercado com volume** | Nicho de ~2M de pessoas comporta 100–200k seguidores. Massa comporta 500k+. |
| 2 | **Profissional bom** | Há densidade técnica real? Sem isso o conteúdo performa e não sustenta autoridade. |
| 3 | **Método** | É esta brain. |
| + | **Não desistir** | O contrato de 90 dias. |

> "Se a gente tiver essas três coisas, é só se a pessoa não desistir antes."

Calibrar a meta ao tamanho do mercado evita o erro mais caro do processo:
diagnosticar fracasso de execução no vídeo 40 quando o problema era a meta.

---

## Início rápido

### 1. Perfil novo

```bash
cp -r data/perfis/_template data/perfis/<handle>
```

### 2. Núcleo de Influência

Rode o modo `nucleo` do agente (`agent/SKILL.md`). Ele conduz o intake dos 5
campos e grava `perfil.json`.

**Sem núcleo completo o agente não gera roteiro** — por desenho. Roteiro sem
núcleo produz conteúdo genérico, que traz view e não traz audiência qualificada.

### 3. Lote semanal

Modo `lote` → 7 ou 14 roteiros para **uma única sessão de gravação**. Composição
padrão de um lote de 7:

| Qtd | Tipo |
|---|---|
| 2 | Escala do vencedor da semana |
| 3 | Cruzamento de assuntos virais |
| 1 | Template "já está entre nós" |
| 1 | Aposta / formato novo |

Equilibra explotação e exploração: escala o que funciona sem deixar o perfil
previsível — previsibilidade é penalizada pelo algoritmo.

### 4. Publique e meça

1/dia, horário fixo. Instagram **e** TikTok. Registre em `metricas.csv`.

### 5. Diagnostique

Modo `analise` → árvore de decisão → diretriz do próximo lote. O ciclo fecha.

---

## Exemplo de saída (modo `lote`)

Formato exato de uma peça, usando o nicho do case como demonstração:

```markdown
### Peça 03 — lote-01-03

**Gancho (0–3s):**
> A epidemia de mulheres jovens infartando na academia já está entre nós.

**Stakes (3–8s):**
> Esse vídeo é um alerta para milhões de mulheres que fazem todos os dias
> coisas que deixam seus corações totalmente vulneráveis.

**CTA de salvamento (8–10s):**
> Por isso é muito importante que você já salve esse vídeo.

**Briefing técnico (10s → fim) — PARA O ESPECIALISTA:**
- Quais hábitos pré-treino elevam risco cardíaco em mulheres jovens
- O marcador que não aparece em check-up de rotina
- Adiar a conclusão para depois de 1:00 para sustentar retenção
> ⚠️ Não escrevo o conteúdo. Densidade e precisão são do especialista.

**Metadados:** template=`ja-esta-entre-nos` | duração-alvo=`2:00–2:15`

**Validação:** T1 ✓ (14 palavras) · T2 ✓ (espelho nominal) · T3 ✓ (por quê?)
· T4 ✓ (não fecha) · T5 ✓ (alarma sem acusar — autoridade preservada)
```

O CTA de salvamento vem **antes** do conteúdo, não depois: pede-se a ação no
pico de tensão, quando a pessoa já sabe que o assunto é sobre ela mas ainda não
teve a resposta.

---

## KPIs-alvo

Números declarados pela fonte, lidos ao vivo no painel do Instagram.

| KPI | Meta | Excepcional | Diagnostica |
|---|---|---|---|
| Taxa de pulados (3s) | ≤ 30% | ≤ 20% | **o gancho** |
| Retenção média | ≥ 25% | ≥ 50% | **o roteiro** |
| Taxa de interação | ≥ 20% | ≥ 25% | **a distribuição** |
| Conversão em seguidores | — | 3,8% medido | **a qualificação** |

### A regra que mais gente erra

> "Até o dia 21 ela tinha ganho **400 seguidores**. (...) no dia 21 o primeiro
> vídeo começou a furar a bolha e nos próximos 11 dias ela ganhou 100.000."

**Antes do vídeo ~20, views não são sinal.** Nessa fase o único sinal confiável
é a retenção interna — que não depende de quanto o algoritmo distribuiu.
Diagnosticar "não funciona" no vídeo 12 por views baixas é o erro que o
contrato de 90 dias existe para impedir.

A curva é **exponencial, não linear**:

| Marco | Reels | Seguidores | Por reels |
|---|---|---|---|
| Dia 21 | 21 | 400 | ~19 |
| Dia 32 | ~30 | 100.000 | ~3.300 |
| Dia 100 | 94 | 500.000 | ~5.300 |

Abandonar na fase de teste não economiza esforço — destrói todo o retorno.

### Furar a bolha vs. falar com a base

Num perfil maduro, nem todo vídeo faz o mesmo trabalho. Medido no mesmo perfil:

| Views | Seguidores | Conversão | Função |
|---|---|---|---|
| 2.600.000 | 32.000 | 1,23% | aquisição |
| 129.000 | 297 | 0,23% | conexão com a base |

Views abaixo da média **não são falha** — são conteúdo de retenção. Aplicar
critério de aquisição a uma peça de base aposenta um gancho que estava fazendo
o trabalho certo.

> "Todo reels vai viralizar? Não. Porém, quando eu entendo o método (...) eu vou
> acertar mais vezes."

O método não promete acerto por peça. Promete **taxa de acerto**.

---

## Expectativa honesta

O case principal fez 0 → 100k em 32 dias. **Não use esse número como
projeção.** A mesma fonte apresenta um case que levou 5 meses.

**Faixa realista: 1 a 5 meses até o destravamento.**

E o case de 32 dias teve o criador do método, equipe audiovisual e editores
dedicados. É teto, não média. Detalhes e limites em `brain/07`.

---

## Extração

```bash
pip install yt-dlp
./tools/extract.sh data/fonte-nova "https://www.youtube.com/@canal/videos"
```

### Cookies

Instagram exige sessão autenticada (`302 → /accounts/login`). YouTube aplica bot
gate após poucas requisições de um IP de datacenter.

```bash
export IG_COOKIES=/caminho/cookies-instagram.txt
export YT_COOKIES=/caminho/cookies-youtube.txt
./tools/extract.sh data/elias-ig "https://www.instagram.com/elias.maman/"
```

Exporte com a extensão **"Get cookies.txt LOCALLY"** (formato Netscape), logado
na plataforma. **Use uma conta secundária** — sessão exportada dá acesso à conta
enquanto o cookie for válido. Cookies ficam fora do repositório (`.gitignore`).

---

## Replicação para N perfis

| Camada | Escopo | Muda por perfil? |
|---|---|---|
| `brain/` | Método | **Nunca** |
| `agent/` | Lógica | **Nunca** |
| `data/perfis/<handle>/` | Núcleo, ganchos, métricas, lotes | **Tudo** |

Validar em @torquatoads e replicar significa, literalmente: copiar o template,
rodar o intake. Nada de código muda.

### Aprendizado entre perfis

Ganchos que funcionam em **nichos diferentes** são o sinal mais forte de que o
padrão é estrutural, não temático. Esses são candidatos a virar template da
brain.

**Critério de promoção:** validado em ≥ 2 perfis, ≥ 2 nichos. Só então edite
`brain/02`. Isso impede que a brain acumule superstição de um único case.

---

## Cobertura contra o currículo oficial

O curso Método Audience (R$ 79,90) publica sua estrutura. A brain cobre
**4 dos 8 módulos integralmente** e os outros 4 parcialmente — nesses, tem a
mecânica mas não as listas enumeradas (7 gatilhos, 30 formatos de headline,
8 elementos, 7 formatos de roteiro), que são o produto pago.

Em compensação, a brain tem o que o curso não dá: os números reais lidos no
painel ao longo de 100 dias, a árvore de diagnóstico e a integração num agente
replicável.

Mapa completo em `brain/00-INDEX.md`. **Melhor ROI disponível:** comprar o curso
e transcrever as quatro listas — ~4h de trabalho que levam a biblioteca de
ganchos de 2 formatos validados para 30.

---

## Limites declarados

1. **Números não auditados** — todos autodeclarados pela fonte.
2. **Viés de sobrevivência** — só os cases que deram certo são divulgados.
3. **Case conduzido pelo criador** — com equipe dedicada. Não é a condição de
   um operador solo.
4. **Dependência de plataforma** — os KPIs refletem o algoritmo do Instagram na
   janela fev–jul/2026. Recalibre contra a média do próprio perfil.

Cada afirmação da brain é marcada **[V]** verbatim, **[D]** derivado ou **[I]**
inferido. O agente é instruído a nunca apresentar **[I]** como **[V]**.

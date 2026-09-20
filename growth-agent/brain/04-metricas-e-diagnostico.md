# 04 — Métricas e diagnóstico

Os números-alvo do método são explícitos na fonte e vêm da leitura ao vivo do
painel do Instagram no case. Este arquivo é o que permite ao agente **decidir**
em vez de opinar.

> "Crescer no Instagram é uma ciência." **[V]**

---

## Os 4 KPIs do método

### 1. Taxa de pulados (skip rate nos 3s)

Percentual que abandona antes dos 3 segundos. **É o KPI do gancho.**

| Faixa | Leitura | Fonte |
|---|---|---|
| ≤ 20% | Excepcional | 17% medido — "gente, tá muito bom isso aqui" **[V]** |
| ~30% | Bom — meta prática | "30% de reels pulados, ou seja, 70% das pessoas ficam mais do que 3 segundos. Ponta pra gente." **[V]** |
| > 40% | Gancho falhou | **[I]** |

**Meta operacional: ≤ 30%.**

### 2. Retenção média (tempo médio ÷ duração)

**É o KPI do roteiro.** Alvo declarado literalmente: **[V]**

> "A gente tá com uns 40% aqui de retenção. **Eu busco 25%** para vocês terem."

| Faixa | Leitura |
|---|---|
| ≥ 50% | Excepcional — 69s em reels de 2:10 **[V]** |
| 40% | Muito bom — 50s em reels de 2:11 **[V]** |
| **25%** | **Meta declarada do método** **[V]** |
| < 25% | Roteiro perde a pessoa no meio **[D]** |

### 3. Taxa de interação (interações ÷ views)

**É o KPI de distribuição.** Referência citada no painel do IG: **[V]**

> "As interações. O reels tá com 2.700 [views], 20% seria 540. Ele tá com quase
> 25% de interação. (...) Isso é métrica pessoal de vídeo acima de 10 milhões
> de views."

| Faixa | Leitura |
|---|---|
| ≥ 25% | Excepcional |
| **20%** | **Referência do método** |
| < 20% | Conteúdo não mobiliza |

> Nota de calibração **[I]**: esse patamar é alto porque foi lido em volume
> baixo (2.700 views), onde a base é o público mais engajado. Em volume alto a
> taxa cai naturalmente. Usar 20% como referência **na fase de teste**; acima de
> ~50k views, comparar contra a média do próprio perfil, não contra 20%.

### 4. Conversão em seguidores (seguidores ÷ views)

**É o KPI de qualificação da audiência.** Medições do case: **[V]**

| Peça | Views | Seguidores | Taxa |
|---|---|---|---|
| Reels "jejum × autoimune" (IG) | 166.000 | 6.300 | **3,8%** |
| Primeiro vídeo (TikTok) | 580.000 | 2.700 | 0,47% |

O contraste importa: o vídeo do Instagram converteu **8× melhor** por view. Views
não são o produto — seguidor qualificado é. **[D]**

---

## A regra que muda todo diagnóstico precoce

> "Às vezes vai ter que postar 30 vídeos, 40 para entregar o primeiro. E não é
> porque o vídeo tá fora do potencial viral dele, é porque o Instagram vai te
> testar." **[V]**

No case, **o reels #21 foi o primeiro a entregar.** **[V]**

### Consequência operacional

**Antes do vídeo ~20, views não são sinal.** Nessa janela o único sinal
confiável é a **retenção interna** (KPIs 1 e 2), que não depende de quanto o
algoritmo distribuiu.

| Fase | Vídeos | O que olhar | O que ignorar |
|---|---|---|---|
| Teste | 1–20 | Pulados, retenção | Views, seguidores |
| Destravamento | 21–40 | Views + as anteriores | — |
| Escala | 40+ | Conversão, média móvel | Picos isolados |

Diagnosticar "não está funcionando" no vídeo 12 por causa de views baixas é o
erro que o contrato de 90 dias (§ `01`, Etapa 0) existe para impedir. **[D]**

---

## Árvore de diagnóstico

Entrada: métricas de uma peça ou de um lote. Saída: **uma ação**.

```
┌─ Pulados > 30%?
│  └─ SIM → GANCHO É O PROBLEMA
│           Não mexa no conteúdo. Reescreva os 3 primeiros segundos.
│           Ação: cruzamento de assuntos virais (§02, técnica 1)
│
├─ Pulados OK, mas retenção < 25%?
│  └─ SIM → ROTEIRO É O PROBLEMA
│           O gancho comprou, o meio perdeu.
│           Ação: aplicar frase-corrente (§03); cortar rodeio;
│                 encurtar a peça
│
├─ Retenção OK, mas interação < 20%?
│  └─ SIM → FALTA PEDIDO E TENSÃO
│           Ação: CTA de salvamento no bloco 3 (0–10s, §02);
│                 elevar stakes
│
├─ Métricas internas OK, views baixas, vídeo ≤ 20?
│  └─ SIM → FASE DE TESTE. NÃO MUDE NADA. INSISTIR.
│           Ação: manter cadência. Publicar no TikTok para confirmar.
│           └─ Foi bem no TikTok? → confirmado: conteúdo bom, conta imatura
│           └─ Mal nos dois?       → é conteúdo. Volte ao topo da árvore.
│
├─ Métricas internas OK, views baixas, vídeo > 40?
│  └─ SIM → NÚCLEO DE INFLUÊNCIA PROVAVELMENTE ERRADO
│           Ação: revisar Etapa 1. Público mal recortado ou dor
│                 fora do vocabulário do público.
│
└─ Entregou acima da média?
   └─ SIM → ESCALA DE CONTEÚDO
            Ação: clonar estrutura do gancho, trocar o tema.
                  2–4 variações no próximo lote. (§02, técnica 3)
```

---

## Curva de referência do case

Para calibrar expectativa — não como promessa. **[V]**

| Marco | Vídeos | Seguidores |
|---|---|---|
| Início (18/fev) | 0 | 0 |
| Dia 21 (antes de furar a bolha) | 21 | **400** |
| — | 26 | 40.000 |
| — | 27 | 58.700 |
| **Dia 32** | ~30 | **100.000** |
| Dia 34 | — | 111.000 |
| +30 dias (com pé fora do acelerador) | — | +123.000 |

Velocidade de pico medida no Social Blade: **9.300 seguidores em um dia**,
depois 8.000, depois 3.000. **[V]**

Contraponto honesto, da própria fonte: **[V]**

> "A gente tem casos que o primeiro vídeo que a pessoa postou bateram milhões de
> views. (...) mas a gente tem casos que levou três meses. A gente tem um perfil
> (...) da Naturales, que vendem marmita congelada. (...) Levou 5 meses para
> começar a dar certo."

**Faixa realista: 1 a 5 meses até o destravamento.** O agente deve usar essa
faixa, não os 32 dias, ao projetar expectativa. **[D]**

---

## Painel mínimo de acompanhamento

Por peça publicada, registrar em `../data/perfis/<perfil>/metricas.csv`:

```csv
data,video_n,plataforma,gancho_id,template,duracao_s,views,pulados_pct,tempo_medio_s,retencao_pct,interacoes,seguidores_ganhos,status
```

Por dia, registrar seguidores totais (o método usa Social Blade para isso **[V]**).

O agente lê esse CSV antes de cada lote novo. Sem ele, o agente gera às cegas —
e o ciclo de aprendizado que torna o sistema replicável não fecha.

---

## Furar a bolha vs. falar com a base

Distinção que muda o diagnóstico depois que o perfil amadurece. Nem todo vídeo
tem a mesma função. **[V]**

> "Esse vídeo foi abaixo da média dela. Ele trouxe 297 seguidores. **Ele não
> furou a bolha**, esse reels. Mas cara, são 129.000 pessoas que viram. Esse
> vídeo está cumprindo um efeito legal, ele está conectado com a audiência dela."

| Tipo | Views | Seguidores novos | Função |
|---|---|---|---|
| **Fura a bolha** | Muito acima da média | Muitos | **Aquisição** |
| **Fala com a base** | Na média ou abaixo | Poucos | **Retenção e conexão** |

### Dados medidos no mesmo perfil **[V]**

| Views | Seguidores | Conversão | Leitura |
|---|---|---|---|
| 2.600.000 | 32.000 | 1,23% | furou a bolha |
| 1.700.000 | 17.000 | 1,00% | furou a bolha (30% pulados) |
| 129.000 | 297 | **0,23%** | falou com a base |

A conversão cai ~5× quando o vídeo circula dentro da base. É **esperado**, não
é falha: o seguidor já está lá, não há o que converter. **[D]**

### Por que isso importa para o diagnóstico

> "Nunca reclame de ter 100.000 views. (...) esses vídeos de 100.000 não trazem
> tanto seguidor porque ela está falando com a base dela." **[V]**

Num perfil maduro, **views abaixo da média não são sinal de falha** — são o
comportamento normal de conteúdo de retenção. O erro é tratar todo vídeo como
peça de aquisição e concluir que o método parou de funcionar.

**Regra de proporção** (não declarada na fonte, inferida da distribuição
observada): a maioria das peças fala com a base; uma minoria fura a bolha. O
que sustenta o crescimento é **manter a cadência** para que as que furam
apareçam. **[I]**

> "Todo reels vai viralizar? Não. Porém, quando eu entendo o método, quando eu
> entendo como empacotar o meu conteúdo de um jeito que as pessoas queiram
> ouvir, **eu vou acertar mais vezes**." **[V]**

O método não promete acerto por peça — promete **taxa de acerto**.

### Impacto na árvore de diagnóstico

Na fase de escala (40+ vídeos), antes de aplicar a árvore, classifique a peça:

- Views ≥ ~2× a média → era peça de aquisição. Avalie por seguidores ganhos.
- Views ≈ média → era peça de base. Avalie por retenção e interação, **não por
  seguidores**.

Aplicar critério de aquisição a uma peça de base gera falso negativo e leva a
trocar um gancho que estava fazendo o trabalho certo. **[D]**

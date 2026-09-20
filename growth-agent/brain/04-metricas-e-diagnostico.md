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
| Primeiro a entregar | 21 | ~1.000 |
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

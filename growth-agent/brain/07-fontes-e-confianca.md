# 07 — Fontes e confiança

Procedência de tudo nesta brain. Auditável.

---

## Fontes primárias extraídas

| ID | Fonte | Tipo | Volume | Papel |
|---|---|---|---|---|
| `YT-WxjFSl9li9o` | "I Took My Doctor Wife from 0 to 100k Instagram Followers" — canal Elias Mamam | Transcrição automática pt-BR | **7.689 palavras** | **Fonte primária principal.** Método completo, etapa a etapa, com métricas lidas ao vivo |
| `YT-7zQl02Mv9Cg` | "My Wife Is Losing A Lot Of Money On Instagram" | Transcrição automática pt-BR | 2.593 palavras | Camada de monetização: tripé e Efeito da Árvore |
| `YT-AeFKIhB-2CA` | Short do canal | Transcrição | 129 palavras | Marginal |
| `WEB-core-audience` | `page.eliasmaman.com.br/core-audience/` | Página oficial | — | Estrutura comercial e pilares da imersão |

Arquivos brutos preservados em `../data/raw/`.

### Identificação do criador

- Instagram: **@elias.maman** — ~1M seguidores. Posicionamento: "Marketing da Atenção"
- YouTube: **@eliasmaman** / `UCZekKOXuNjxq6QSGh8HSixg` — **1,31M inscritos**
- Empresa: **Core Educação** (sócio: Fabio Mariani, também OnProfit)
- Produtos: Método Audience (curso), imersão presencial Core Audience

> Nota: o canal do YouTube tem 1,31M de inscritos mas apenas **5 vídeos
> publicados** — indica reinício editorial recente, agora em inglês e focado em
> crescimento de perfil. A janela de captura pegou o material no começo dessa
> fase.

---

## Cobertura e lacunas

### Coberto com fonte primária forte

- ✅ Método completo, 7 etapas
- ✅ Núcleo de Influência (5 campos, definição verbatim)
- ✅ Técnica de cruzamento de assuntos virais
- ✅ Template "já está entre nós" (3 ocorrências)
- ✅ Escala de conteúdo
- ✅ KPIs numéricos (pulados, retenção, interação) com alvos declarados
- ✅ Curva de crescimento do case, vídeo a vídeo
- ✅ Tripé de monetização e Efeito da Árvore

### Lacunas conhecidas

| Lacuna | Causa | Impacto | Mitigação |
|---|---|---|---|
| **Conteúdo do Instagram (@elias.maman, ~1M)** | IG exige sessão autenticada: `302 → /accounts/login`, `429`, API `web_profile_info` descontinuada | Alto — é o canal principal dele | Fornecer cookie de sessão (ver README) |
| **2 dos 5 vídeos do YouTube** | Bot gate do YouTube no IP do runner após ~6 requisições | Médio | Cookie do YouTube ou nova janela |
| **Entrevistas e podcasts de terceiros** | Mesmo bot gate | Médio | Idem |
| **Conteúdo pago (curso Método Audience)** | Não acessível publicamente | Baixo | O reality documenta o método aplicado — a fonte primária é suficiente para operar |

**Avaliação honesta:** a lacuna do Instagram é real, mas o vídeo `WxjFSl9li9o` é
uma fonte de qualidade incomum — é o criador aplicando o próprio método do zero,
narrando cada decisão e lendo métricas na tela. Vale mais que centenas de posts.
A brain está operacional. O Instagram enriqueceria a biblioteca de ganchos, não
o método.

---

## Escala de confiança

| Marcador | Significado | Uso permitido |
|---|---|---|
| **[V]** | Citação verbatim da fonte | Afirmar como fato do método |
| **[D]** | Derivado sem salto interpretativo | Afirmar, sinalizando que é leitura nossa |
| **[I]** | Inferência nossa | **Sempre** rotular como hipótese a validar |

**Regra dura para o agente:** ao recomendar, separar o que é método validado do
que é aposta. Nunca apresentar **[I]** como **[V]**.

---

## Limites que o agente deve declarar

1. **Números não auditados.** Todos os resultados são autodeclarados pela fonte.
2. **Viés de sobrevivência.** Os cases divulgados são os que deram certo. Não há
   dados sobre quem seguiu o método e não cresceu.
3. **Case conduzido pelo criador.** O case principal teve o criador do método,
   equipe audiovisual e editores dedicados. Não é a condição de um operador solo.
4. **Dependência de plataforma.** Os KPIs refletem o comportamento do algoritmo
   do Instagram na janela observada (fev–jul/2026). Algoritmo muda; os alvos
   precisam ser recalibrados contra a média do próprio perfil.

---

## Reprodutibilidade

Pipeline de extração versionado em `../tools/extract.sh`. Para reexecutar ou
ampliar a captura, ver `../README.md` § Extração.

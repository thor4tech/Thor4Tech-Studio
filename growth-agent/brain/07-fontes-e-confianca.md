# 07 — Fontes e confiança

Procedência de tudo nesta brain. Auditável.

---

## Fontes primárias extraídas

| ID | Fonte | Tipo | Volume | Papel |
|---|---|---|---|---|
| `YT-WxjFSl9li9o` | "I Took My Doctor Wife from 0 to 100k Instagram Followers" — canal Elias Mamam | Transcrição automática pt-BR | **7.689 palavras** | **Fonte primária principal.** Método completo, etapa a etapa, com métricas lidas ao vivo |
| `YT-7zQl02Mv9Cg` | "My Wife Is Losing A Lot Of Money On Instagram" | Transcrição automática pt-BR | 2.593 palavras | Camada de monetização: tripé e Efeito da Árvore |
| `YT-Tc8QZSiUBsk` | "It's Terrifying What Happened to My Doctor Wife's Instagram" | Transcrição automática pt-BR | **4.502 palavras** | **Segunda fonte crítica.** Os 3 ingredientes, furar a bolha, coerência persona/tese, dados de 100 dias |
| `YT-ni5cE46BMLM` | Vídeo do canal (tema saúde/comportamento) | Transcrição | 178 palavras | Marginal |
| `YT-AeFKIhB-2CA` | Short do canal | Transcrição | 129 palavras | Marginal |
| `IG-CuK91l7uyQk` | Post @elias.maman — "Método Atenção Digital" (Shark Tank / Camila Farani) | Legenda via metadados públicos | — | Confirma nomenclatura anterior do método |
| `WEB-core-audience` | `page.eliasmaman.com.br/core-audience/` | Página oficial | — | Estrutura comercial e pilares da imersão |
| `WEB-curriculo` | `cursosdigital10.com.br/cursos/metodo-audience/` | Currículo publicado do curso | 8 módulos + 4 bônus | **Valida a brain contra a estrutura oficial.** Ver mapa de cobertura em `00-INDEX.md` |

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
- ✅ Os 3 ingredientes de viabilidade (mercado, profissional, método)
- ✅ Furar a bolha vs. falar com a base, com conversão medida nos dois casos
- ✅ Coerência entre persona de entrega e tese do conteúdo
- ✅ Eficiência por reels ao longo de 100 dias

### Lacunas conhecidas

| Lacuna | Causa | Impacto | Mitigação |
|---|---|---|---|
| **Conteúdo do Instagram (@elias.maman, ~1M)** | IG exige sessão autenticada: `302 → /accounts/login`, `429`, API `web_profile_info` descontinuada | Alto — é o canal principal dele | Fornecer cookie de sessão (ver README) |
| ~~2 dos 5 vídeos do YouTube~~ | ~~Bot gate~~ | — | ✅ **Resolvido** — os 5 vídeos do canal foram extraídos |
| **Entrevistas e podcasts de terceiros** | Mesmo bot gate | Médio | Idem |
| **4 listas enumeradas do curso** (7 gatilhos, 30 formatos de headline, 8 elementos, 7 formatos de roteiro) | Conteúdo pago — R$ 79,90 | Médio | Comprar e transcrever. A brain cobre a mecânica dessas categorias; não as listas. Ver mapa de cobertura em `00-INDEX.md` |

**Avaliação honesta:** a lacuna do Instagram é real, mas os vídeos
`WxjFSl9li9o` (7.689 palavras) e `Tc8QZSiUBsk` (4.502 palavras) são fontes de
qualidade incomum — é o criador aplicando o próprio método do zero, narrando
cada decisão e lendo as métricas na tela ao longo de 100 dias. Valem mais que
centenas de posts. **A brain está operacional.** O Instagram enriqueceria a
biblioteca de ganchos, não o método.

**Nota de rota:** legendas de posts individuais do Instagram são acessíveis por
metadados públicos (`instagram.com/p/<id>/`), mesmo com a página de perfil
bloqueada. Com uma lista de IDs de posts, dá para montar biblioteca de ganchos
sem cookie — mais lento, porém viável.

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

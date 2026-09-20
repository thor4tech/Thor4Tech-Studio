# Template de perfil

```bash
cp -r data/perfis/_template data/perfis/<novo-perfil>
```

Depois rode o modo `nucleo` do agente para preencher `perfil.json`.

| Arquivo | Conteúdo |
|---|---|
| `perfil.json` | Núcleo de Influência, contrato, restrições |
| `ganchos.jsonl` | Um gancho por linha, com métricas após publicar |
| `metricas.csv` | Uma linha por peça publicada |
| `lotes/` | Lotes gerados, um arquivo por lote |

Nada aqui é compartilhado entre perfis. A brain é que é universal.

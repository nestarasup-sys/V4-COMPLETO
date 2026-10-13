# Gacha V4 — Criador de Corpo & Pose

Editor desktop para personagens chibi com **16 slots (2×8)**, prévia 9:16 e rig articulado por partes.

## Começar
Requer Node.js 20+.

```bash
npm install
npm start
```

Modo navegador (sem Electron): abra `index.html` em um navegador moderno; o estado usa localStorage.

## Recursos do MVP
- 16 slots independentes com criar, copiar, renomear e excluir;
- folha de **10 peças vetorizadas da imagem fornecida**, de modo que as articulações possam ser editadas separadamente;
- edição por arraste (mover / girar), pontos de conexão, propriedades numéricas, simetria e presets de pose;
- prévia vertical 9:16, desfazer/refazer, auto-salvamento local, importação/exportação JSON e PNG transparente;
- Electron com preload isolado, diálogos de arquivo e salvamento atômico no perfil do usuário.

## Arquitetura
- `src/core.js`: esquema, rig, matrizes, persistência e renderer SVG puro.
- `src/renderer.js`: interface, editor e interação.
- `electron/main.cjs`, `electron/preload.cjs`: camada desktop.
- `AGENTS.md`: tarefas e contratos de continuação para o Codex.

**Importante:** projeto de criação de personagens separado do Gacha Editor V4 de timelines. Exporta seu formato editável `gacha-body-v1`; compatibilidade com `schema_version: 3` e `character_tracks` do editor de vídeo é uma etapa futura descrita no AGENTS.md.

Os contornos SVG foram derivados da imagem-base fornecida pelo autor. Não estão incluídos cabelo, rosto ou roupas por enquanto.

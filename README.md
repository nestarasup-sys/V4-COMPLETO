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

## Nova experiência de edição (rodada UX)

**Personagens** é a tela inicial: 16 slots e uma prévia 9:16 da pose oficialmente aplicada. Clique no cartão **Corpo / Pose** para entrar em um estúdio separado. Modificações do rascunho **não alteram a prévia inicial**; clique em **Aplicar ao personagem** para publicar a pose. Você pode voltar sem aplicar; seu rascunho continua salvo para editar depois.

No estúdio, o modo padrão é **Mover** (atalho `V`): arraste uma peça diretamente. `R` ativa **Girar**. Para encaixar, use as setas de **1 pixel**, Shift+seta para **10 pixels**, ou os campos X/Y; **Encaixar** volta a posição da peça ao seu ponto padrão sem desfazer a rotação. Os cinco presets alteram apenas o rascunho. **Guardar pose** cria uma opção na biblioteca pessoal e **Editar** carrega essa pose no estúdio, sem aplicar à prévia.

A versão de projeto continua `gacha-body-v1`: `pose` é a pose aplicada, `workingPose` é o rascunho independente e `savedPoses` é a biblioteca por personagem. Projetos antigos sem esses campos são migrados no carregamento. A prévia e a exportação PNG utilizam `pose`, não `workingPose`.

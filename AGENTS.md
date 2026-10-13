# AGENTS.md — continuidade para o Codex

## Missão
Evoluir este repositório de **editor de corpo e poses chibi** para um criador de personagens Gacha próprio, com qualidade para uso diário. O MVP inicial já existe. **Não substitua a UI por uma landing page nem descarte o rig.** Trabalhe incrementalmente e rode os testes antes de finalizar.

## Estado implementado
- Electron (processo principal e preload, sem nodeIntegration no renderer).
- 16 slots em grade **2 colunas × 8 linhas**; prévia vertical 9:16 ao lado.
- Aba Corpo/Pose com 10 peças vetorizadas da arte fornecida, editor por arraste, gizmos, rotação, translação, snap, grade, zoom, presets.
- JSON próprio \`format: gacha-body-v1\`, versão 1, 16 slots.
- PNG transparente, import/export JSON, autosave, desfazer/refazer.
- Código: \`src/core.js\` (matemática/rig/serialização), \`src/renderer.js\` (UI), \`src/drag.js\` (gestos), \`index.html\`, \`styles.css\`.

## Primeira sessão do Codex (ordem)
1. Execute \`npm run check && npm test\`, instale dependências e abra o Electron. Gere **capturas reais** de janela, em largura 1366 e 1920, inspecione os 16 slots, viewport 9:16 e as 10 peças.
2. Adicione teste de interação end-to-end (Playwright/Electron ou equivalente), cobrindo arrastar cabeça, cotovelo e joelho, espelhamento, troca de slot, Ctrl+Z/Ctrl+Y, import/export e reinício com persistência. Não confunda teste unitário com teste desktop.
3. Corrija anatomia e pivôs: a montagem neutra deve parecer **contínua**, sem juntas soltas, em todos os cinco presets. Faça pivôs precisos próximos do ombro, cotovelo, quadril, joelho e pescoço. Garanta arraste e rotação em qualquer nível da hierarquia, sob zoom e espelhamento.
4. Modifique controles numéricos para suportarem digitação contínua, undo em gesto único, teclado fino, limites sensatos e feedback visual sem apagar foco.
5. Crie o **gerenciador de poses**: salvar pose personalizada, miniatura, nome, editar, excluir, aplicar, copiar entre personagens, exportar/importar presets, migrar dados de versão anterior.
6. Crie pipeline de **assets por peça**: importar PNG/WebP transparente, remover chroma key opcional com tolerância configurável, recortar em atlas, coordenadas/pivôs configuráveis, sem contaminar arte com fundo verde. Preserve os SVGs existentes como assets padrão e guarde origem/créditos.
7. Amplie personagem para camadas separadas: rosto/olhos/boca, cabelo, roupas/acessórios, camadas e ordem de render, cores por peça, espelhamento correto. Não assumir assets inexistentes nem inventar arquivos.
8. Polir UX: atalhos visíveis, seleção intuitiva, botões acessíveis, mensagens de sucesso/cancelamento corretas, recursos de duplicação e exclusão protegidos, tema refinado e layouts responsivos.
9. Monte workflow de release com artefatos Windows (NSIS), Linux (AppImage), macOS (DMG), versionamento/tag, CI, sem certificados secretos embutidos. Validar em runners dedicados.
10. Documente formato, migrações, API do rig, decisões sobre pivôs, e integração futura com o Gacha Editor V4.

## Compatibilidade com Editor V4 / Guia V13
**Não confundir** o projeto \`gacha-body-v1\` (edição geométrica da boneca) com o projeto de vídeo V13. A integração deve ser um **adaptador explícito** e separado, não um alias falso de formatos.

Contrato V13 conhecido:
- JSON final de timeline: \`schema_version: 3\`.
- \`timeline[]\` contém conteúdo/timing; \`character_tracks_version: 1\` e \`character_tracks\` controlam aparência persistente.
- \`timeline_tracks_version: 1\` e \`timeline_tracks\` guardam metadados de faixa.
- Segmentos de faixa têm \`start_frame\` e \`end_frame\` exclusivo, state **completo**, contínuo e sem overlaps.
- TALK/BLINK são roles temporais, não expressões autorais novas.
- Preview e export devem resolver a mesma aparência canônica em cada frame.
- Assets e paths relativos. Não inventar assets de expressão/pose que não existem.
- Só implementar exportador V13 quando houver mapeamento verificável de nomes de pose/expressão/variant e geração de sprites compatíveis.

## Regras de engenharia
- Preserve a autoria do usuário nos contornos vetorizados e a edição independente de peças.
- Evite dependências de CDN, chamadas remotas silenciosas, trackers e \`nodeIntegration: true\`.
- Nunca permitir que JSON importado execute scripts, injete HTML ou escape da pasta de gravação.
- Qualquer mudança no formato editável exige versão/migração documentadas e testes.
- Cada PR deve incluir: resumo do comportamento, passos de teste, capturas, problemas restantes e alterações de schema, se houver.
- Não declarar Electron/render/export testados visualmente sem capturas ou execução real.
- Manter interface em português brasileiro.

## Critérios mínimos para a próxima entrega
- Tela sem overflow funcional em 1366×768 e 1920×1080.
- Três personagens distintos preservam poses/cores entre reinícios.
- Articulações contínuas, sem separação visível na pose neutra.
- Desfazer/refazer após drag, sliders e presets.
- Exportação PNG com alpha e JSON reimportável; tests desktop cobrindo os dois.
- Pipeline CI verde e instalador Windows disponível como artefato.

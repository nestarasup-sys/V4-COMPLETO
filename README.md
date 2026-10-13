# Gacha V4 — Criador de Corpo e Pose

Editor desktop em português para personagens chibi, com 16 slots, prévia oficial em 9:16 e estúdio independente de montagem por peças.

## Abrir no Windows

Dê duplo clique em `Abrir Gacha V4.bat` na pasta do projeto. O launcher instala as dependências se o Electron ainda não estiver instalado e abre o aplicativo. Mantenha a janela do terminal aberta enquanto testa; ela mostra qualquer mensagem de erro.

## Começar

Requer Node.js 20 ou superior.

```bash
npm ci
npm start
```

## Fluxo de edição

A tela **Personagens** mostra os 16 slots e a pose publicada. **Corpo / Pose** abre o estúdio: ajustes, presets e poses carregadas alteram somente `workingPose`. Use **Aplicar ao personagem** para publicar a pose; voltar à tela inicial preserva o rascunho.

O estúdio inicia em **Mover**. Arraste qualquer peça; `R` alterna para girar e `V` para mover. Setas deslocam 1 px e Shift+seta desloca 10 px. Os campos X, Y e ângulo aceitam edição decimal contínua e registram uma ação de undo. Poses salvas ficam associadas ao personagem selecionado, têm miniaturas e podem ser carregadas como rascunho, duplicadas, renomeadas, copiadas para outro personagem ou importadas/exportadas como `gacha-pose-v1`.

## Dados e segurança

Projetos usam `format: gacha-body-v1`, versão 1, com 16 slots. Cada personagem contém `pose` (publicada), `workingPose` (rascunho independente) e `savedPoses` (até 40 entradas). Projetos antigos sem rascunho ou poses salvas são normalizados a partir de `pose`. A prévia inicial e a exportação PNG usam apenas a pose publicada.

O Electron mantém `contextIsolation`, sandbox e `nodeIntegration: false`. JSON importado é validado antes de ser salvo; arquivos de usuário ficam no perfil local. Este projeto é separado do editor de vídeo Gacha V4 e não afirma compatibilidade direta com o formato de timeline V13.

## Verificação

```bash
npm run check
npm test
npm run ui-test
```

Os testes cobrem a geometria de juntas nos cinco presets, normalização e segurança do JSON, navegação entre páginas, rascunho versus pose publicada, edição numérica, CRUD/importação/exportação de poses, cópia entre personagens, undo/redo, arraste direto, preview 9:16, PNG transparente, persistência após reabrir a janela e capturas reais do Electron.

Capturas do smoke:

![Tela de personagens em 1366 por 768](artifacts/ui-home-1366.png)

![Estúdio de pose em 1366 por 768](artifacts/ui-pose-1366.png)

![Tela de personagens em 1920 por 1080](artifacts/ui-home-1920.png)

## Limites atuais

O rig usa dez contornos vetoriais; cabelo, rosto detalhado, roupas e pipeline de assets por peça ainda precisam ser implementados. Não há adaptador de exportação para o formato de timeline do editor de vídeo.


# Eclipse Solar Total — León 2026

Planeador familiar (single-page app) para a observação do **Eclipse Solar Total de 12 de Agosto de 2026** com base em León, Espanha.

A app é totalmente estática (HTML + CSS + JS vanilla). Não tem backend, não depende de APIs pagas e funciona offline depois de carregada pela primeira vez.

## Como usar

1. Faz o download / clone desta pasta.
2. Abre o ficheiro `index.html` num browser moderno (Chrome, Firefox, Edge, Safari).
   - Não é preciso servidor. Basta duplo clique no `index.html`.
   - Em alternativa, podes servir a pasta com qualquer servidor estático, por exemplo:
     ```
     python -m http.server 8000
     ```
     e abrir `http://localhost:8000`.
3. Escolhe o **Spot Principal** e o **Spot Backup**. As escolhas e a checklist ficam guardadas em `localStorage` (no próprio browser).
4. Usa o seletor de **condição do tempo** para ver qual o spot recomendado pela matriz de decisão.
5. No fim, clica em **Imprimir / Guardar PDF** para levar o plano contigo.

### Versão single-file (para partilhar)

Se preferires partilhar tudo num único ficheiro (ex.: enviar por email/WhatsApp), usa:

```
eclipse-leon-2026.html
```

Contém HTML, CSS, dados e lógica num só ficheiro (~88 KB). Basta abrir num browser — funciona offline (apenas o mapa Leaflet precisa de Internet; se falhar, a app continua a funcionar sem ele).

Para regerar este ficheiro depois de editares `data.js` / `app.js` / `styles.css`:

```
node build-bundle.js
```

## O que a app inclui

- **Resumo no topo**: Base, Spot Principal e Spot Backup.
- **Contagem decrescente** até à totalidade — atualizada em tempo real (passa a "TOTALIDADE EM CURSO" no momento e a "Eclipse concluído" depois).
- **Spots de observação** (4 spots perto de León) com filtros por distância, tipo e prioridade, e ordenação por facilidade ou experiência.
- **Diagrama da posição do Sol** (SVG) em cada card de spot — mostra altitude (~7-8°) e azimute (~283°, W-by-N) à hora da totalidade. Útil para confirmar que o horizonte W/NW está mesmo livre.
- **Duração da totalidade por spot** (estimativa) como badge no card — Babia tem totalidade mais longa por estar mais perto da linha central; Páramo Leonés tem totalidade mais curta por estar mais a sul.
- **Mapa OpenStreetMap (Leaflet)** com marcadores dos spots. Se a biblioteca falhar a carregar, a app continua a funcionar com a lista de spots.
- **Hotéis em León** (4 sugestões, com nota curta e botão para copiar o nome).
- **Meteorologia (Open-Meteo)** — botão para obter previsão por spot para 12 Ago 2026, 20:00 CEST. Mostra nuvens (total / baixas / médias / altas), temperatura, vento, prob. precipitação, visibilidade, e um badge de status (Excelente / Bom / Marginal / Mau). API gratuita, sem chave. Janela útil: 16 dias antes do eclipse (fora dessa janela mostra erro claro com dias em falta). Inclui **sugestão automática** baseada na média regional, com botão "Aplicar à matriz" que atualiza o seletor da matriz de decisão.
- **Plano do Dia** com linha temporal e seletor de **condição do tempo** que destaca o spot recomendado.
- **Matriz de Decisão** em tabela.
- **Fases do Eclipse** (C1, C2, Máximo, C3, Pôr-do-Sol, C4) — note-se que C4 ocorre depois do Sol se pôr em León.
- **"O que Esperar"** — 8 cards explicativos (diamond ring, grãos de Baily, coroa, bandas de sombra, queda de temperatura, crepúsculo 360°, planetas visíveis, reação dos animais).
- **Cues de Áudio (Web Speech API)** — 12 avisos por voz (PT/EN) que tocam no momento exato de cada fase: -5min de C1, C1, -30min/-60s/-10s/0/+6s de C2, Max, -30s/-10s/0 de C3, Sunset. Para C3 (mais crítico de segurança) há mensagem alternativa "stale" caso o tab tenha estado suspenso. Ativação com um clique ("Ativar cues de áudio") por exigência da política de autoplay dos browsers. Inclui botão **Pré-visualizar todos** para testar antes do dia, **Wake Lock** opcional para manter ecrã ligado (precisa HTTPS), e estado persistente em `sessionStorage` (sobrevive a refresh).
- **Checklist** persistente em `localStorage`, com botão de reset e de imprimir.
- **Notas Importantes** com avisos de segurança (óculos ISO, horizonte W/NW, etc.).
- Toggle de idioma **PT / EN** (PT por defeito).
- **Robusto a localStorage indisponível** (modo privado, file:// em alguns browsers): a app continua a funcionar, só não persiste escolhas.

### Cues de áudio — limitações importantes

- Tens de **clicar em "Ativar"** uma vez por sessão (política de autoplay; igual a vídeos no YouTube). Se fechares o separador, é preciso re-ativar.
- O browser tem de **estar aberto e o ecrã ligado** durante o eclipse. Cues NÃO tocam com o telefone bloqueado.
- O **Wake Lock** (manter ecrã ligado) só funciona em **HTTPS** (Azure Static Web Apps, GitHub Pages, etc.) — não funciona em `file://`.
- **iPhone Safari** tem mais limitações que Android Chrome (vozes carregam tarde, fala pára após inactividade). Recomenda-se Android.
- A janela de "catch-up" por cue evita que cues atrasados toquem fora de tempo (ex.: "tira os óculos" 2 min depois). Para C3 há lembrete de segurança alternativo.
- Os textos dos cues são **conservadores** — timings são aproximados (±30-60s entre spots). Confia nos teus próprios olhos, não só no áudio.

## Como editar conteúdo

Quase todo o conteúdo está em [`data.js`](./data.js). Edita esse ficheiro para alterar:

- **Spots** (`APP_DATA.spots`):
  - `id` (único), `name`, `type` (`plano` | `elevado` | `montanha`)
  - `distance` (`near` | `medium` | `long`) e `distanceLabel`
  - `coords` (`[lat, lng]`) — opcional, usado pelo mapa
  - `why`, `alerts` (array de strings), `howToFind`
  - `tags` (ex.: `["seguro", "fotogenico"]`)
  - `facility` e `experience` (1–5) — usados na ordenação
  - `sun: { altitude, azimuth }` — graus, à hora da totalidade. Usado no diagrama SVG.
  - `totalityDurationSec` e `totalityLabel` — duração estimada da totalidade no spot.

- **Eclipse / countdown** (`APP_DATA.eclipse`): horas em UTC do início/meio/fim da totalidade. Usadas pelo countdown.

- **Meteo** (`APP_DATA.meteo`): endpoint, data e hora alvo (`eclipseDateLocal`, `eclipseHourLocal`), timezone, e lista de variáveis horárias a pedir ao Open-Meteo. Para testar a integração antes de a janela de 16 dias abrir, podes alterar temporariamente `eclipseDateLocal` para uma data próxima.

- **Fases** (`APP_DATA.phases`): cada fase tem `code`, `time` (texto exibido), `tUTC` (timestamp ISO usado pelos cues de áudio), `title`, `detail`. Põe `tUTC: null` para fases sem cue (ex.: C4).

- **Cues de áudio** (`APP_DATA.audioCues`): array de objetos com `id`, `refPhase` (C1|C2|Max|C3|Pôr), `offsetSec` (negativo = antes da fase), `catchupSec` (janela em segundos para disparar cue atrasado), `textPt`, `textEn`, e opcionais `staleTextPt`/`staleTextEn` (texto alternativo se cue chegou atrasado >3s). Configuração geral em `APP_DATA.audio`: `previewPauseMs`, `preferredVoicePt`/`preferredVoiceEn` (lista de substrings de nomes de voz preferidos), `clockEndMarginMs`.

- **Expectations** (`APP_DATA.expectations`): cada item com `title` e `detail`.

- **Hotéis** (`APP_DATA.hotels`): `name` + `notes` (array de etiquetas curtas).

- **Plano do dia** (`APP_DATA.timeline`): blocos `time` / `title` / `detail`.

- **Matriz de decisão** (`APP_DATA.decisionMatrix`): mapa `weather → { spotId, reason }`.
  - As opções `weather` correspondem a `APP_DATA.weatherOptions`.

- **Checklist** (`APP_DATA.checklist`): cada item tem `id` (único) e `label`.

- **Notas** (`APP_DATA.notes`): array de strings.

- **Traduções** (`APP_DATA.i18n.pt` e `APP_DATA.i18n.en`).

Depois de guardar, basta recarregar o `index.html` no browser.

## Estrutura de ficheiros

```
eclipse-spain-2026/
├── index.html      # estrutura da página
├── styles.css      # estilos (mobile-first)
├── app.js          # lógica (filtros, ordenação, estado, mapa, i18n)
├── data.js         # conteúdo editável (spots, hotéis, plano, etc.)
└── README.md       # este ficheiro
```

## Notas técnicas

- **Sem frameworks**, sem build step. Só ficheiros estáticos.
- **Leaflet** é carregado via CDN. Se não carregar (offline, CDN bloqueado, etc.), a app mostra automaticamente o aviso "Mapa indisponível" e continua a funcionar.
- A persistência usa `localStorage`. Para "esquecer" tudo, basta limpar os dados do site no browser.
- O CSS de impressão (`@media print`) esconde filtros, botões e o mapa para gerar um PDF limpo.

## Avisos de segurança (importante)

- **Nunca olhar para o Sol sem óculos certificados ISO 12312-2**, exceto durante os poucos minutos de **totalidade**.
- **Binóculos / telescópios** precisam de filtro solar adequado **à frente** das lentes. Olhar pelo binóculo sem filtro pode causar cegueira instantânea.
- A totalidade só ocorre **dentro da faixa central**. Fora dela, o eclipse é parcial — e os óculos têm de estar postos a 100% do tempo.

## Licença

Uso pessoal/familiar. Sem garantias.

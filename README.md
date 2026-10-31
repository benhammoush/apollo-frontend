# Apollo — dashboard

A read-only edition of the original Apollo dashboard, prepared for public
release. It is a modular, single-window workspace: charts, datasets and logs can
sit side by side, with tools for moving between tabular data and its chart
context. The original project's trading and operator controls are excluded.

## Tech stack

| Layer                 | Technology                           |
| --------------------- | ------------------------------------ |
| Interface and routing | React, TypeScript, React Router       |
| Workspace panels      | react-resizable-panels               |
| Charts                | Lightweight Charts                   |
| Tables and JSON views | TanStack Virtual, UIW React JSON View |
| Build and checks      | Vite, TypeScript, Node.js test runner  |

## Features

### Single-window multitasking

- Keep multiple workspace tabs, each with its own panel arrangement and chart
  configuration, rather than repeatedly replacing a single view.
- Choose split layouts with up to eight slots. Resize adjacent panels using the
  dividers and drag panel headers to rearrange their contents.
- Mix chart, dataset and log panels in the same workspace. A slot's content can
  be switched without changing the entire workspace.
- Compare different symbols or timeframes side by side. Optional symbol linking
  updates chart slots together while retaining their individual timeframes.
- Restore workspace tabs, chart preferences and theme from browser storage.
  Mobile uses a single-slot layout instead of squeezing the desktop grid onto
  a small screen.

### Chart tools and navigation

- Inspect candlestick history and live quotes with per-chart symbol, source and
  timeframe selection, scrolling, zooming and historical navigation.
- Measure price ranges, draw Fibonacci tools, adjust their settings and clear
  drawings without leaving the chart.
- Use a measured range's starting point to navigate another chart, choosing the
  destination timeframe while carrying over the source symbol.
- Customize chart colours and grid presentation, and reuse chart templates
  instead of configuring every panel from scratch.

Selected indicator entries are intentionally masked and disabled in this
read-only edition; drawing and navigation tools are separate from those controls.

### Connected storage and chart panels

Storage is part of the analysis workspace, not just a separate file list. When
backend-selected datasets are available, a dataset panel can remain open beside
one or more charts:

1. Browse a result table and select a timestamp through its date-navigation tool.
2. Choose an open chart as the destination, rather than replacing the dataset view.
3. The chart navigates to that point, uses the row's symbol when supplied and
   briefly highlights the target date. History requests still respect the
   backend's selected sources and read limits.

This connects a row-level observation to its market context while keeping the
table available for comparison and further navigation.

### Dataset exploration

- Browse selected result folders and inspect tables or JSON in an embedded panel.
- Work with wide tables using row and column virtualization, global search,
  expression filters, per-column filters, sorting and local row marking.
- Copy loaded data and switch between table and JSON views. For paged results,
  search, sorting, JSON and copying apply to loaded rows, not unseen pages.
- Display selected example templates with synthetic dates and `xxxx` placeholders
  instead of private research values. Available datasets depend on backend
  selection; no collection is bundled with the dashboard.

### Read-only engine presentation

Engine cards preserve the original control layout with masked names and disabled
Run buttons. The log viewer contains 10 fixed synthetic snapshots illustrating
queued, running, completed and failed jobs. They can be selected and searched,
but are explicitly examples: they do not execute computations or report live job
activity.

## Boundaries and integration

Shared visual tokens, dark/light themes and reusable presentation are owned by
the [Apollo design system](src/design-system/README.md), separate from market
data access and workspace behaviour.

The browser reads market history and selected result tables from the Apollo
visitor API, with live market events delivered over WebSocket. The backend owns
MT5 connectivity, source selection, result access and request limits; the
frontend handles navigation, chart workspaces and presentation.

The dashboard cannot start or stop workers, execute trades or run strategies.
MT5 credentials, private operator controls, original research datasets and the
original application's Git history are excluded. Data is selected on the backend;
no datasets or live service are bundled with the frontend.

## License and notices

Original first-party source is available for portfolio inspection under the
[source terms](LICENSE.md), not a general open-source reuse licence. Third-party
software retains its own licences in the [dependency notices](review-assets/third-party-notices.txt).

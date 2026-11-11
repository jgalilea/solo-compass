import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OracleView } from "./components/OracleView";
import { HistoryProvider } from "./hooks/HistoryContext";
import { ThemeProvider } from "./hooks/ThemeContext";
import { ModeProvider } from "./hooks/ModeContext";
import { LocaleProvider } from "./hooks/LocaleContext";
import { OracleProvider } from "./hooks/OracleContext";
import { JournalProvider } from "./hooks/JournalContext";
import { CustomTablesProvider } from "./hooks/CustomTablesContext";
import { SavedRollsProvider } from "./hooks/SavedRollsContext";
import { GeneratorsProvider } from "./hooks/GeneratorsContext";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { preloadable } from "./lib/preloadable";

// The oracle is where the app opens (the manifest's start_url), so it
// stays in the main bundle; every other screen is its own chunk,
// fetched once the first screen is up (preloadAll, from Layout).
const TablesView = preloadable(() => import("./components/TablesView").then((m) => m.TablesView));
const DiceView = preloadable(() => import("./components/DiceView").then((m) => m.DiceView));
const JournalListView = preloadable(() => import("./components/JournalListView").then((m) => m.JournalListView));
const AdventureDetailView = preloadable(() =>
  import("./components/AdventureDetailView").then((m) => m.AdventureDetailView),
);
const HistoryView = preloadable(() => import("./components/HistoryView").then((m) => m.HistoryView));

function App() {
  // LocaleProvider goes outside the error boundary so that, if something
  // blows up further down, the boundary itself can show its message in
  // the right language (it reads the context via contextType).
  return (
    <LocaleProvider>
      <AppErrorBoundary>
        <ThemeProvider>
          <ModeProvider>
            <OracleProvider>
              <JournalProvider>
                <HistoryProvider>
                  <CustomTablesProvider>
                    <SavedRollsProvider>
                      <GeneratorsProvider>
                        <HashRouter>
                          <Routes>
                            <Route element={<Layout />}>
                              <Route index element={<OracleView />} />
                              <Route path="tablas" element={<TablesView />} />
                              <Route path="dados" element={<DiceView />} />
                              <Route path="diario" element={<JournalListView />} />
                              <Route path="diario/:adventureId" element={<AdventureDetailView />} />
                              <Route path="historial" element={<HistoryView />} />
                            </Route>
                          </Routes>
                        </HashRouter>
                      </GeneratorsProvider>
                    </SavedRollsProvider>
                  </CustomTablesProvider>
                </HistoryProvider>
              </JournalProvider>
            </OracleProvider>
          </ModeProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </LocaleProvider>
  );
}

export default App;

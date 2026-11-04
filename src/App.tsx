import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OracleView } from "./components/OracleView";
import { TablesView } from "./components/TablesView";
import { HistoryView } from "./components/HistoryView";
import { JournalListView } from "./components/JournalListView";
import { AdventureDetailView } from "./components/AdventureDetailView";
import { HistoryProvider } from "./hooks/HistoryContext";
import { ThemeProvider } from "./hooks/ThemeContext";
import { ModeProvider } from "./hooks/ModeContext";
import { LocaleProvider } from "./hooks/LocaleContext";
import { OracleProvider } from "./hooks/OracleContext";
import { JournalProvider } from "./hooks/JournalContext";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

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
                  <HashRouter>
                    <Routes>
                      <Route element={<Layout />}>
                        <Route index element={<OracleView />} />
                        <Route path="tablas" element={<TablesView />} />
                        <Route path="diario" element={<JournalListView />} />
                        <Route path="diario/:adventureId" element={<AdventureDetailView />} />
                        <Route path="historial" element={<HistoryView />} />
                      </Route>
                    </Routes>
                  </HashRouter>
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

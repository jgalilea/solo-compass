import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OracleView } from "./components/OracleView";
import { TablesView } from "./components/TablesView";
import { HistoryView } from "./components/HistoryView";
import { HistoryProvider } from "./hooks/HistoryContext";
import { ThemeProvider } from "./hooks/ThemeContext";
import { LocaleProvider } from "./hooks/LocaleContext";
import { OracleProvider } from "./hooks/OracleContext";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

function App() {
  // LocaleProvider va fuera del error boundary para que, si algo
  // revienta más abajo, el propio boundary pueda mostrar su mensaje
  // en el idioma correcto (lee el contexto vía contextType).
  return (
    <LocaleProvider>
      <AppErrorBoundary>
        <ThemeProvider>
          <OracleProvider>
            <HistoryProvider>
              <HashRouter>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<OracleView />} />
                    <Route path="tablas" element={<TablesView />} />
                    <Route path="historial" element={<HistoryView />} />
                  </Route>
                </Routes>
              </HashRouter>
            </HistoryProvider>
          </OracleProvider>
        </ThemeProvider>
      </AppErrorBoundary>
    </LocaleProvider>
  );
}

export default App;

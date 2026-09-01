import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OracleView } from "./components/OracleView";
import { TablesView } from "./components/TablesView";
import { HistoryView } from "./components/HistoryView";
import { HistoryProvider } from "./hooks/HistoryContext";
import { ThemeProvider } from "./hooks/ThemeContext";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
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
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

export default App;

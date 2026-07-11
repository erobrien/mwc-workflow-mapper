import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import { Shell } from "./components/Shell";
import Home from "./pages/Home";
import AsIs from "./pages/AsIs";
import Inventory from "./pages/Inventory";
import ToBe from "./pages/ToBe";
import Diagrams from "./pages/Diagrams";
import Decisions from "./pages/Decisions";
import Risks from "./pages/Risks";
import Gaps from "./pages/Gaps";
import SalesForm from "./pages/SalesForm";
import WorkflowDetail from "./pages/WorkflowDetail";
import WFDiagrams from "./pages/WFDiagrams";
import AsisDiagrams from "./pages/AsisDiagrams";
import AsisFlows from "./pages/AsisFlows";
import Tags from "./pages/Tags";
import CustomFields from "./pages/CustomFields";
import DailyLog from "./pages/DailyLog";

const wrap = (el: React.ReactNode) => <Shell>{el}</Shell>;

const router = createBrowserRouter([
  { path: "/", element: wrap(<Home />) },
  { path: "/daily-log", element: wrap(<DailyLog />) },
  { path: "/as-is", element: wrap(<AsIs />) },
  { path: "/inventory", element: wrap(<Inventory />) },
  { path: "/asis-diagrams", element: wrap(<AsisDiagrams />) },
  { path: "/asis-flows", element: wrap(<AsisFlows />) },
  { path: "/to-be", element: wrap(<ToBe />) },
  { path: "/to-be/:tab", element: wrap(<ToBe />) },
  { path: "/diagrams", element: wrap(<Diagrams />) },
  { path: "/pcc-form", element: wrap(<SalesForm />) },
  { path: "/decisions", element: wrap(<Decisions />) },
  { path: "/risks", element: wrap(<Risks />) },
  { path: "/gaps", element: wrap(<Gaps />) },
  { path: "/workflow/:id", element: wrap(<WorkflowDetail />) },
  { path: "/wf-diagrams", element: wrap(<WFDiagrams />) },
  { path: "/tags", element: wrap(<Tags />) },
  { path: "/custom-fields", element: wrap(<CustomFields />) },
  { path: "*", element: wrap(<div className="py-20 text-center text-muted-foreground">Page not found.</div>) },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

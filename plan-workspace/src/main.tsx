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
import Messages from "./pages/Messages";
import Plan from "./pages/Plan";
import Prompts from "./pages/Prompts";
import Decisions from "./pages/Decisions";
import Risks from "./pages/Risks";
import Gaps from "./pages/Gaps";
import SalesForm from "./pages/SalesForm";
import WorkflowDetail from "./pages/WorkflowDetail";
import WFDiagrams from "./pages/WFDiagrams";
import Tags from "./pages/Tags";
import CustomFields from "./pages/CustomFields";
import TelemedOverview from "./pages/TelemedOverview";
import TelemedConfig from "./pages/TelemedConfig";
import TelemedWorkflows from "./pages/TelemedWorkflows";
import TelemedMessages from "./pages/TelemedMessages";
import TelemedPortal from "./pages/TelemedPortal";
import TelemedGhl from "./pages/TelemedGhl";
import TelemedPlan from "./pages/TelemedPlan";

const wrap = (el: React.ReactNode) => <Shell>{el}</Shell>;

const router = createBrowserRouter([
  { path: "/", element: wrap(<Home />) },
  { path: "/as-is", element: wrap(<AsIs />) },
  { path: "/inventory", element: wrap(<Inventory />) },
  { path: "/to-be", element: wrap(<ToBe />) },
  { path: "/to-be/:tab", element: wrap(<ToBe />) },
  { path: "/diagrams", element: wrap(<Diagrams />) },
  { path: "/messages", element: wrap(<Messages />) },
  { path: "/messages/:tab", element: wrap(<Messages />) },
  { path: "/pcc-form", element: wrap(<SalesForm />) },
  { path: "/plan", element: wrap(<Plan />) },
  { path: "/plan/:tab", element: wrap(<Plan />) },
  { path: "/prompts", element: wrap(<Prompts />) },
  { path: "/decisions", element: wrap(<Decisions />) },
  { path: "/risks", element: wrap(<Risks />) },
  { path: "/gaps", element: wrap(<Gaps />) },
  { path: "/workflow/:id", element: wrap(<WorkflowDetail />) },
  { path: "/wf-diagrams", element: wrap(<WFDiagrams />) },
  { path: "/tags", element: wrap(<Tags />) },
  { path: "/custom-fields", element: wrap(<CustomFields />) },
  { path: "/telemed", element: wrap(<TelemedOverview />) },
  { path: "/telemed/config", element: wrap(<TelemedConfig />) },
  { path: "/telemed/workflows", element: wrap(<TelemedWorkflows />) },
  { path: "/telemed/messages", element: wrap(<TelemedMessages />) },
  { path: "/telemed/portal", element: wrap(<TelemedPortal />) },
  { path: "/telemed/ghl", element: wrap(<TelemedGhl />) },
  { path: "/telemed/plan", element: wrap(<TelemedPlan />) },
  { path: "*", element: wrap(<div className="py-20 text-center text-muted-foreground">Page not found.</div>) },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

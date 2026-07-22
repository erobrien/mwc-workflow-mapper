import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { PasswordGate } from "./components/PasswordGate";
import "./index.css";
import { Shell } from "./components/Shell";
import Home from "./pages/Home";
import AsIs from "./pages/AsIs";
import Inventory from "./pages/Inventory";
import ToBe from "./pages/ToBe";
import ToBeReview from "./pages/ToBeReview";
import MinimalPlan from "./pages/MinimalPlan";
import ToBeWorkflow from "./pages/ToBeWorkflow";
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
import Cody from "./pages/Cody";
import CodyFlows from "./pages/CodyFlows";
import CodyInventory from "./pages/CodyInventory";
import CodyNeo from "./pages/CodyNeo";
import CodyNeoFlows from "./pages/CodyNeoFlows";
import CodyNeoInventory from "./pages/CodyNeoInventory";
import CodyNeoFieldDiff from "./pages/CodyNeoFieldDiff";
import FinalTarget from "./pages/FinalTarget";
import SystemsArchitecture from "./pages/SystemsArchitecture";
import SacPlan from "./pages/SacPlan";
import CustomFields from "./pages/CustomFields";
import DailyLog from "./pages/DailyLog";
import PriorityChanges from "./pages/PriorityChanges";
import AttributionAudit from "./pages/AttributionAudit";
import LifecyclePlaybook from "./pages/LifecyclePlaybook";

const wrap = (el: React.ReactNode) => <Shell>{el}</Shell>;

const router = createBrowserRouter([
  { path: "/", element: wrap(<Home />) },
  { path: "/daily-log", element: wrap(<DailyLog />) },
  { path: "/as-is", element: wrap(<AsIs />) },
  { path: "/inventory", element: wrap(<Inventory />) },
  { path: "/priority-changes", element: wrap(<PriorityChanges />) },
  { path: "/attribution-audit", element: wrap(<AttributionAudit />) },
  { path: "/lifecycle-playbook", element: wrap(<LifecyclePlaybook />) },
  { path: "/asis-diagrams", element: wrap(<AsisDiagrams />) },
  { path: "/asis-flows", element: wrap(<AsisFlows />) },
  { path: "/cody", element: wrap(<Cody />) },
  { path: "/cody-flows", element: wrap(<CodyFlows />) },
  { path: "/cody-inventory", element: wrap(<CodyInventory />) },
  { path: "/cody/workflow/:id", element: wrap(<WorkflowDetail dataset="cody" />) },
  { path: "/cody-neo", element: wrap(<CodyNeo />) },
  { path: "/cody-neo-flows", element: wrap(<CodyNeoFlows />) },
  { path: "/cody-neo-inventory", element: wrap(<CodyNeoInventory />) },
  { path: "/cody-neo-field-diff", element: wrap(<CodyNeoFieldDiff />) },
  { path: "/cody-neo/workflow/:id", element: wrap(<WorkflowDetail dataset="codyneo" />) },
  { path: "/systems", element: wrap(<SystemsArchitecture />) },
  { path: "/final-target", element: wrap(<FinalTarget />) },
  { path: "/final-target-sac", element: wrap(<SacPlan />) },
  { path: "/to-be", element: wrap(<ToBe />) },
  { path: "/to-be-review", element: wrap(<ToBeReview />) },
  { path: "/minimal-plan", element: wrap(<MinimalPlan />) },
  { path: "/to-be/wf/:n", element: wrap(<ToBeWorkflow />) },
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
    <PasswordGate><RouterProvider router={router} /></PasswordGate>
  </React.StrictMode>
);

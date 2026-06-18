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
  { path: "*", element: wrap(<div className="py-20 text-center text-muted-foreground">Page not found.</div>) },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

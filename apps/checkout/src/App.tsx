import { Routes, Route } from "react-router-dom";
import CheckoutForm from "./pages/CheckoutForm";
import Confirmation from "./pages/Confirmation";

export default function CheckoutApp() {
  return (
    <Routes>
      <Route index element={<CheckoutForm />} />
      <Route path="confirmation" element={<Confirmation />} />
    </Routes>
  );
}

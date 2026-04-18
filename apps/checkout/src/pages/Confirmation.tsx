import { Link } from "react-router-dom";

export default function Confirmation() {
  return (
    <div>
      <h2>Order Confirmed!</h2>
      <p>Thank you for your purchase.</p>
      <Link to="/">Continue Shopping</Link>
    </div>
  );
}

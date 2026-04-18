import { useParams } from "react-router-dom";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h2>Product Detail</h2>
      <p>Viewing product: {id}</p>
    </div>
  );
}

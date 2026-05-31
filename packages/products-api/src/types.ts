/**
 * Public view of a product. This is the contract — changing this is a
 * breaking change requiring a major version bump and consumer migration.
 */
export interface ProductView {
  id: string;
  name: string;
  price: number;
  category?: string;
}

// Estimation taille par entité (octets moyens)
export const BYTES = {
  user: 250,
  customer: 500,
  customerNote: 400,
  customerDocument: 300,
  reservation: 800,
  folioCharge: 300,
  housekeeping: 350,
  room: 250,
  roomType: 200,
  menuItem: 250,
  table: 200,
  restaurantOrder: 400,
  restaurantOrderItem: 250,
  orderPayment: 200,
  cashRegister: 300,
  cashMovement: 300,
  cashSession: 400,
  sale: 350,
  catalogItem: 400,
  backup: 0, // à part
};

export function fmtBytes(n: number): { bytes: number; ko: number; mo: number; human: string } {
  const ko = n / 1024;
  const mo = ko / 1024;
  let human = `${n} o`;
  if (mo >= 1) human = `${mo.toFixed(2)} Mo`;
  else if (ko >= 1) human = `${ko.toFixed(1)} Ko`;
  return { bytes: n, ko: +ko.toFixed(2), mo: +mo.toFixed(3), human };
}

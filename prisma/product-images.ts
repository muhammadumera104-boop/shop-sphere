// Demo product photography (Unsplash). Development/demo data only.
// Each id was checked to resolve (HTTP 200) before being added.
const PHOTO: Record<string, string> = {
  "AE-EB-01": "photo-1590658268037-6bf12165a8df", // wireless earbuds
  "AE-SW-02": "photo-1546868871-7041f2a55e12", // smart watch
  "AE-CH-03": "photo-1583863788434-e58a36330cf0", // charger
  "AE-SP-04": "photo-1608043152269-423dbba4e7e1", // bluetooth speaker
  "AE-PB-05": "photo-1609091839311-d5365f9ff1c5", // power bank
  "AE-HP-06": "photo-1505740420928-5e560c06d30e", // headphones
  "AE-CB-07": "photo-1583394838336-acd977736f90", // cable
  "AE-FB-08": "photo-1575311373937-040b8e1fd5b6", // fitness band
  "AE-NB-09": "photo-1572569511254-d8f925fe2cbb", // earphones
  "AE-MS-10": "photo-1527864550417-7fd91fc51a46", // mouse
  "SF-KU-01": "photo-1610030469983-98e550d6193c", // kurta
  "SF-LW-02": "photo-1583391733956-3750e0ff4e8b", // lawn suit
  "SF-PO-03": "photo-1586790170083-2f9ceadc732d", // polo shirt
  "SF-DU-04": "photo-1617627143750-d86bc21e42bb", // dupatta
  "HN-LA-01": "photo-1507473885765-e6ed057f782c", // desk lamp
  "HN-FP-02": "photo-1590794056226-79ef3a8147e1", // fry pan
  "HN-WB-03": "photo-1602143407151-7111542de6e8", // steel bottle
  "HN-FL-04": "photo-1513001900722-370f803f498d", // fairy lights
  "GG-RI-01": "photo-1586201375761-83865001e31c", // rice
  "GG-DF-02": "photo-1596591606975-97ee5cef3a1e", // dry fruits
  "GG-FW-03": "photo-1556228720-195a672e8a03", // face wash
  "GG-HO-04": "photo-1608248597279-f99d160bfcbc", // hair oil
  "GG-BK-05": "photo-1512820790803-83ca734da794", // story book
  "GG-BK-06": "photo-1503676260728-1c00da094a0b", // workbook
};

export function productImageUrl(sku: string): string | null {
  const id = PHOTO[sku];
  return id ? `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=75` : null;
}

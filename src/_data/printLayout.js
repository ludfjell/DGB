// Page layout of the PDF menu: which menu sections go on which A4 sheet (design only – content lives in
// content/meny.yml). Ids are section ids from meny.yml; subsections (wines, spirits) can be placed directly.
// A print section that is not placed here is added on an extra sheet at the end, so nothing goes missing.
//
//   sections: [...]          sections stacked down the sheet
//   columns: [[...], [...]]  two columns of sections (drinks, wine)
//   subColumns               subsections of one section in two columns (spirits)
//   allergens: true          allergen key at the bottom of the sheet
export default [
  { sections: ["forretter-og-snacks", "store-smorbrod"], allergens: true },
  { sections: ["salat", "suppe", "pasta"], allergens: true },
  { sections: ["burgere"], allergens: true },
  { sections: ["barnemeny", "dessert-og-kaker", "snacks"], allergens: true },
  { columns: [["ol", "flaske-ol", "cider-og-annet"], ["alkoholfritt", "mineralvann"]] },
  { columns: [["musserende-vin", "hvitvin"], ["rodvin", "rosevin"]] },
  { sections: ["drinker", "varme-drinker"] },
  {
    sections: ["sprit-og-likor"],
    subColumns: [
      ["cognac", "calvados", "akevitt", "rom", "bitter"],
      ["whisky", "gin", "vodka", "likor"],
    ],
  },
];

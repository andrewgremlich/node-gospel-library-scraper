// This index number pertains to whatever book of scripture found
// in GOSPEL_LIBRARY_URL
/**
 * 0 = OT
 * 1 = NT
 * 2 = BOM
 * 3 = D&C
 * 4 = PGP
 */
export const parseBook = (value, previous) => {
  const scriptures = ["OT", "NT", "BOM", "D&C", "PGP"];
  const valueToPass = scriptures.indexOf(value);

  if (valueToPass > -1) {
    return valueToPass;
  } else {
    process.exit(-1);
  }
};

export const libraryUrl = (value, previous) => {
  if (!value) {
    console.error("Library URL is not set!");
    process.exit(-1);
  } else {
    return value;
  }
}
export const printAsync = jest.fn().mockResolvedValue({});
export const print = jest.fn().mockResolvedValue({});
export const selectColorDiffBetween = jest.fn().mockReturnValue(0);
export const ColorComparator = {
  compare: jest.fn().mockReturnValue(0),
};

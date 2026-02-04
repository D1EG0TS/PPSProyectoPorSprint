import { getExpirationStatus } from '../date';

describe('getExpirationStatus', () => {
    it('returns N/A for null/undefined date', () => {
        expect(getExpirationStatus(null)).toEqual({ color: 'gray', label: 'N/A' });
        expect(getExpirationStatus(undefined)).toEqual({ color: 'gray', label: 'N/A' });
    });

    it('returns Valid for future date > 30 days', () => {
        const future = new Date();
        future.setDate(future.getDate() + 40);
        const result = getExpirationStatus(future.toISOString());
        expect(result).toEqual({ color: '#4CAF50', label: 'Valid' });
    });

    it('returns Expiring Soon for date <= 30 days', () => {
        const soon = new Date();
        soon.setDate(soon.getDate() + 10);
        const result = getExpirationStatus(soon.toISOString());
        expect(result).toEqual({ color: '#F57C00', label: 'Expiring Soon' });
    });

    it('returns Expired for past date', () => {
        const past = new Date();
        past.setDate(past.getDate() - 1);
        const result = getExpirationStatus(past.toISOString());
        expect(result).toEqual({ color: '#B00020', label: 'Expired' });
    });
});

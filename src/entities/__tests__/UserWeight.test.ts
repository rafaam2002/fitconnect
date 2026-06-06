import { User } from '../User';
import { UserWeight } from '../UserWeight';

describe('UserWeight entity', () => {
  it('should construct correctly and allow decimal weights', () => {
    const mockUser = {} as User;
    const userWeightData = {
      weight: 85.45,
      date: '2026-06-06',
      user: mockUser,
    } as UserWeight;

    const userWeight = new UserWeight(userWeightData);

    expect(userWeight.weight).toBe(85.45);
    expect(userWeight.date).toBe('2026-06-06');
    expect(userWeight.user).toBe(mockUser);
  });
});

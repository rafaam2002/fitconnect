import bcrypt from 'bcrypt';

import { User } from '../User';

jest.mock('bcrypt');

describe('User entity - Check Password', () => {
  let user: User;

  beforeEach(() => {
    user = new User({
      name: 'Rafa',
      nickname: 'rafadev',
      password: 'hashed_password_123',
    } as any);
  });

  it('Lanza un error si el pass es undefined ', async () => {
    user.password = undefined;

    await expect(user.checkPassword('any_password')).rejects.toThrow(
      "La propiedad password no ha sido cargada. Asegúrate de usar populate: ['password']"
    );
  });

  it('Deberia arrojar password si el pass es null ', async () => {
    user.password = null;

    const result = await user.checkPassword('123456');
    expect(result).toBe(false);
  });

  it('Deberia retornar true si bcrypt compara que esta bien el pass', async () => {
    const plainPassword = 'asd123';
    user.password = 'hashed_password_123';

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const result = await user.checkPassword(plainPassword);

    expect(bcrypt.compare).toHaveBeenCalledWith(
      plainPassword,
      'hashed_password_123'
    );
    expect(result).toBe(true);
  });

  it('debería retornar false si bcrypt.compare indica que no coinciden', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await user.checkPassword('wrong_password');

    expect(result).toBe(false);
  });
});

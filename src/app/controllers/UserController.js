import * as Yup from 'yup';

import User from '../models/User';
import File from '../models/File';

class UserController {
  async index(req, res) {
    const users = await User.findAll();

    return res.json(users);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string().email().required(),
      password: Yup.string().required().min(6),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const userExists = await User.findOne({ where: { email: req.body.email } });

    if (userExists) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const {
      id,
      name,
      email,
      provider,
    } = await User.create(req.body);

    return res.json({
      id,
      name,
      email,
      provider,
    });
  }

  async update(req, res) {
    // validação
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      oldPassword: Yup.string().min(6),
      password: Yup.string().min(6).when('oldPassword', (oldPassword, field) => (oldPassword ? field.required() : field)),
      confirmPassword: Yup.string().when('password', (password, field) => (password ? field.required().oneOf([Yup.ref('password')]) : field)),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    // recuperando os valores do email e senha antigos
    const { email, oldPassword } = req.body;

    // recuperando os dados do usuario logado
    const user = await User.findByPk(req.userId);

    // verificando se o email passado é diferente do existente
    if ((email) && email !== user.email) {
      // verificando se o email já não está cadastrado em outra conta
      const userExists = await User.findOne({ where: { email } });

      // retornando o erro
      if (userExists) {
        return res.status(400).json({ error: 'User already exists.' });
      }
    }

    // verificando se a senha antiga bate
    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return res.status(401).json({ error: 'Password does not match' });
    }

    // atualizando o valor do usuario
    await user.update(req.body);

    // recuperando os dados atualizados
    const {
      id, name, avatar,
    } = await User.findByPk(req.userId, {
      include: [
        {
          model: File,
          as: 'avatar',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    console.log(`id: ${id}; nome: ${name}, avatar: ${avatar}`);

    return res.json({
      id,
      name,
      email,
      avatar,
    });
  }
}

export default new UserController();

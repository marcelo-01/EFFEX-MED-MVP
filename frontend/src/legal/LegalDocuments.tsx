import { FileText, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/Modal';

/** Mesma versão registrada no backend (UserConsent.CURRENT_DOCUMENTS_VERSION). */
export const LEGAL_VERSION = '1.0';
export const LEGAL_UPDATED_AT = '14/10/2026';

export type LegalDocument = 'terms' | 'privacy';

export function LegalModal({ document, onClose }: { document: LegalDocument; onClose: () => void }) {
  const isTerms = document === 'terms';
  return (
    <Modal
      title={isTerms ? 'Termos de Uso' : 'Política de Privacidade'}
      subtitle={`Versão ${LEGAL_VERSION} · atualizada em ${LEGAL_UPDATED_AT} · versão preliminar do MVP`}
      icon={isTerms ? <FileText size={20} /> : <ShieldCheck size={20} />}
      onClose={onClose}
      width={680}
      footer={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          Entendi
        </button>
      }
    >
      <div className="legal-text">{isTerms ? <TermsOfUse /> : <PrivacyPolicy />}</div>
    </Modal>
  );
}

function TermsOfUse() {
  return (
    <>
      <h3>1. O que é o Effex Med</h3>
      <p>
        O Effex Med é uma plataforma de comunicação entre médicos e seus pacientes para o acompanhamento entre consultas.
        O chat fica disponível até a data definida pelo médico (normalmente a data do retorno) e pode ser estendido por ele.
      </p>
      <p className="legal-text__alert">
        O Effex Med não é um serviço de emergência e não substitui a consulta médica. Em caso de urgência, procure o
        pronto-socorro mais próximo ou ligue 192 (SAMU).
      </p>

      <h3>2. Cadastro e conta</h3>
      <ul>
        <li>Você deve informar dados verdadeiros e manter sua senha em sigilo. A conta é pessoal e intransferível.</li>
        <li>Médicos devem possuir inscrição ativa no Conselho Regional de Medicina (CRM) informado no cadastro.</li>
        <li>Pacientes só conversam com médicos que cadastraram o seu e-mail na plataforma.</li>
      </ul>

      <h3>3. Uso do chat</h3>
      <ul>
        <li>Após o fim do prazo, o paciente não consegue enviar novas mensagens até que o médico estenda a conversa.</li>
        <li>
          O médico responde conforme a sua disponibilidade e o horário de atendimento que ele configurou. Não há garantia
          de resposta imediata.
        </li>
        <li>
          As orientações dadas pelo chat são de responsabilidade do médico, que deve observar o Código de Ética Médica e
          as normas do Conselho Federal de Medicina sobre atendimento a distância (Resolução CFM nº 2.314/2022).
        </li>
      </ul>

      <h3>4. Condutas não permitidas</h3>
      <p>
        É proibido usar a plataforma para enviar conteúdo ofensivo, ilegal ou de terceiros sem autorização, tentar acessar
        contas ou conversas de outras pessoas, ou utilizar o serviço para fins diferentes da comunicação médico-paciente.
      </p>

      <h3>5. Disponibilidade e alterações</h3>
      <p>
        Podemos atualizar estes Termos e o serviço. Mudanças relevantes serão comunicadas e, quando necessário, pediremos
        um novo aceite. Você pode encerrar sua conta a qualquer momento.
      </p>

      <h3>6. Legislação e contato</h3>
      <p>
        Estes Termos seguem a legislação brasileira, incluindo o Marco Civil da Internet (Lei nº 12.965/2014) e a Lei Geral
        de Proteção de Dados (Lei nº 13.709/2018). Dúvidas podem ser enviadas pelo canal de atendimento do Effex Med.
      </p>
    </>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <p>
        Esta Política explica como o Effex Med trata dados pessoais, de acordo com a Lei Geral de Proteção de Dados (LGPD,
        Lei nº 13.709/2018).
      </p>

      <h3>1. Quem trata os seus dados</h3>
      <p>
        O Effex Med é o controlador dos dados de cadastro. Em relação ao conteúdo das conversas, o Effex Med atua em nome
        do médico responsável pelo atendimento, que também é responsável por esses dados.
      </p>

      <h3>2. Quais dados coletamos</h3>
      <ul>
        <li>
          <b>Cadastro:</b> nome, e-mail e senha (armazenada de forma criptografada). Para médicos, também CRM e
          especialidade.
        </li>
        <li>
          <b>Conversas:</b> mensagens trocadas no chat, que podem conter dados de saúde, considerados dados pessoais
          sensíveis pela LGPD (art. 5º, II).
        </li>
        <li>
          <b>Registros de uso:</b> data e hora de acesso e das mensagens, guardados por no mínimo 6 meses, conforme o Marco
          Civil da Internet (art. 15).
        </li>
      </ul>

      <h3>3. Para que usamos e com qual base legal</h3>
      <ul>
        <li>Criar e manter sua conta e o funcionamento do chat: execução do contrato (art. 7º, V).</li>
        <li>
          Tratar dados de saúde do paciente: consentimento específico e destacado (art. 11, I) e tutela da saúde por
          profissionais de saúde (art. 11, II, “f”).
        </li>
        <li>Guardar registros de acesso: cumprimento de obrigação legal (art. 7º, II).</li>
        <li>Enviar novidades por e-mail: somente com o seu consentimento, que é opcional (art. 7º, I).</li>
      </ul>

      <h3>4. Com quem compartilhamos</h3>
      <p>
        As conversas são visíveis apenas para o paciente e para o médico que o cadastrou. Podemos usar fornecedores de
        infraestrutura (como hospedagem), sob contrato e com obrigação de sigilo, e compartilhar dados com autoridades
        quando exigido por lei. Não vendemos dados pessoais.
      </p>

      <h3>5. Por quanto tempo guardamos</h3>
      <p>
        Mantemos os dados enquanto a conta estiver ativa. Mensagens que fizerem parte do registro do atendimento seguem os
        prazos de guarda exigidos para prontuários (Lei nº 13.787/2018). Depois disso, os dados são excluídos ou
        anonimizados.
      </p>

      <h3>6. Segurança</h3>
      <p>
        Usamos conexão criptografada, senhas protegidas por hash e acesso restrito aos dados. Em caso de incidente de
        segurança relevante, você e a Autoridade Nacional de Proteção de Dados (ANPD) serão comunicados.
      </p>

      <h3>7. Seus direitos (art. 18)</h3>
      <p>
        Você pode, a qualquer momento: confirmar se tratamos seus dados; acessá-los; corrigi-los; pedir anonimização,
        bloqueio ou eliminação de dados desnecessários; pedir a portabilidade; saber com quem foram compartilhados; e
        revogar o consentimento, ciente de que sem ele não é possível usar o chat. Você também pode reclamar à ANPD.
      </p>

      <h3>8. Encarregado de dados (DPO)</h3>
      <p>Os pedidos podem ser feitos ao encarregado pelo tratamento de dados. Contato do encarregado: a definir.</p>
    </>
  );
}

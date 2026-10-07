import { ArrowUp, Download, Menu, X } from 'lucide-react'

import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import ThemeToggle from '../components/ThemeToggle'
import screenshotDashboard from '../../assets/imagens/geldtrack_dashboard.png'
import screenshotRelatorio from '../../assets/imagens/geldtrack_relatorio.png'

const RELEASES_URL = 'https://github.com/itsmariah/geldtrack/releases'
const isDesktopApp = window.location.protocol === 'file:'

export default function Landing() {
  const { user } = useAuth()
  const { canInstall, promptInstall } = useInstallPrompt()
  const navigate = useNavigate()
  const location = useLocation()
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (user && !location.state?.fromApp) navigate('/dashboard')
  }, [user, navigate, location.state])

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 500)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKeyDown = (e) => { if (e.key === 'Escape') setMobileMenuOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileMenuOpen])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="logo"><span className="logo-coin">💰</span> <span className="navbar-brand-text">GeldTrack</span></div>

        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(o => !o)}
          aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={`nav-links${mobileMenuOpen ? ' nav-links--open' : ''}`}>
          <a href="#sobre" className="nav-link" onClick={closeMenu}>Sobre</a>
          <a href="#funcionalidades" className="nav-link" onClick={closeMenu}>Funcionalidades</a>
          {!isDesktopApp && <a href="#desktop" className="nav-link" onClick={closeMenu}>Desktop</a>}
          <ThemeToggle />
          <Link to="/login" className="btn btn-outline btn-sm" onClick={closeMenu}>Entrar</Link>
          <Link to="/cadastro" className="btn btn-primary btn-sm" onClick={closeMenu}>Criar conta</Link>
        </div>
      </nav>

      <section className="hero">
        <h1>Controle suas finanças<br /><span className="gradient-text">com inteligência</span></h1>
        <p>Registre receitas e despesas, sincronize com seu banco, acompanhe insights automáticos e compartilhe a carteira com sua família — na web, no desktop ou instalado no celular.</p>
        <div className="hero-actions">
          <Link to="/cadastro" className="btn btn-primary btn-lg">Usar a versão web</Link>
          {!isDesktopApp && <a href="#desktop" className="btn btn-outline btn-lg"><Download size={18} /> Baixar para desktop</a>}
        </div>
      </section>

      <section id="sobre" className="about">
        <div className="about-text">
          <h2>O que é o GeldTrack?</h2>
          <p>O GeldTrack é uma aplicação de gestão financeira pessoal criada para ajudar você a entender para onde vai o seu dinheiro. Cadastre receitas e despesas, importe extratos bancários ou sincronize direto com seu banco via Open Finance, e acompanhe o saldo atualizado automaticamente — com insights automáticos, projeção de saldo e gráficos que mostram a evolução dos seus gastos mês a mês.</p>
          <p>Disponível como aplicação web, acessível de qualquer navegador, como app desktop instalável ou direto no celular via PWA — e pode ser compartilhado com sua família, todo mundo vendo e lançando na mesma carteira. Organize gastos de viagens em eventos, divida despesas com amigos em grupos e mantenha contas em outras moedas, tudo no mesmo lugar.</p>
        </div>
        <div className="browser-frame">
          <div className="browser-frame-bar">
            <span className="browser-dot browser-dot--red" />
            <span className="browser-dot browser-dot--yellow" />
            <span className="browser-dot browser-dot--green" />
          </div>
          <img
            src={screenshotDashboard}
            alt="Painel do GeldTrack mostrando saldo, receitas e despesas"
            className="about-image"
          />
        </div>
      </section>

      <section id="funcionalidades" className="features-section">
        <h2 className="section-title">Funcionalidades</h2>
        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Controle total</h3>
            <p>Adicione, edite e exclua receitas e despesas, com busca por texto e filtros por tipo, categoria e período.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Metas financeiras</h3>
            <p>Defina uma meta com valor-alvo e prazo, registre aportes e acompanhe o progresso com histórico completo.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📉</div>
            <h3>Orçamento por categoria</h3>
            <p>Estabeleça um limite mensal por categoria e veja o progresso mudar de cor conforme você se aproxima do teto.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔁</div>
            <h3>Transações recorrentes</h3>
            <p>Cadastre aluguel, assinaturas e salário uma vez só — o sistema lança os meses seguintes automaticamente.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h3>Múltiplas contas</h3>
            <p>Separe o dinheiro em conta corrente, cartão ou carteira, agrupadas por instituição, com saldo próprio e transferência entre elas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📥</div>
            <h3>Importação de extratos (OFX)</h3>
            <p>Importe extratos bancários com pré-visualização e auto-categorização antes de confirmar.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📈</div>
            <h3>Relatórios mensais</h3>
            <p>Filtre por tipo, categoria e período, e acompanhe a evolução do saldo nos últimos 6 meses.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🍩</div>
            <h3>Gráficos por categoria</h3>
            <p>Visualize despesas e fontes de renda em gráficos de rosca fáceis de interpretar.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Dados seguros</h3>
            <p>Senhas criptografadas com bcrypt, autenticação via JWT e recuperação de senha por e-mail — cada usuário só acessa os próprios dados.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>Responsivo</h3>
            <p>Interface adaptada para celular, tablet e computador, sem perder nenhuma funcionalidade.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💻</div>
            <h3>App desktop</h3>
            <p>Instale como aplicativo nativo via Electron e use o GeldTrack sem depender do navegador.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👤</div>
            <h3>Perfil personalizável</h3>
            <p>Edite nome, e-mail, senha e foto de perfil a qualquer momento nas configurações da sua conta.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💡</div>
            <h3>Insights automáticos</h3>
            <p>O dashboard aponta sozinho quando um orçamento estoura, um gasto sobe muito ou uma meta está quase batendo.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🏦</div>
            <h3>Sincronização bancária (Open Finance)</h3>
            <p>Conecte sua conta no banco via Open Finance e importe contas e transações automaticamente, com saldo sempre atualizado.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔮</div>
            <h3>Projeção de saldo</h3>
            <p>Veja uma estimativa de como o saldo deve fechar o mês, combinando recorrências futuras com o ritmo atual de gastos.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧾</div>
            <h3>Relatório em PDF</h3>
            <p>Baixe um PDF do fechamento mensal com resumo, gráficos e a lista de transações, pronto pra guardar ou compartilhar.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Categorias personalizadas</h3>
            <p>Crie, renomeie e escolha ícone e cor pras suas categorias — do jeito que fizer mais sentido pra você.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📎</div>
            <h3>Anexo de comprovante</h3>
            <p>Anexe uma foto ou PDF do comprovante em qualquer transação, direto pelo celular ou computador.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🕓</div>
            <h3>Histórico de edição</h3>
            <p>Toda edição em uma transação fica registrada — o que mudou, quando e pra qual valor.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✉️</div>
            <h3>Aviso de orçamento por e-mail</h3>
            <p>Receba um e-mail automático quando o gasto de uma categoria ultrapassar o orçamento definido.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👨‍👩‍👧</div>
            <h3>Contas compartilhadas</h3>
            <p>Compartilhe a mesma carteira com sua família usando um código — todo mundo vê e lança na mesma conta.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📲</div>
            <h3>Instalável no celular</h3>
            <p>Instale o GeldTrack direto do navegador do celular, como um app — sem precisar de loja de aplicativos.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✈️</div>
            <h3>Eventos</h3>
            <p>Agrupe transações de uma viagem ou ocasião especial, defina um orçamento e acompanhe o gasto total à parte do resto das finanças.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Grupos (estilo Splitwise)</h3>
            <p>Divida despesas com amigos (até quem não tem conta), em qualquer moeda, veja quem deve quem e quite os saldos — inclusive em outra moeda.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💱</div>
            <h3>Multi-moeda</h3>
            <p>Tenha contas em dólar, euro ou libra com cotação atualizável, transfira entre moedas e veja o total consolidado em reais no Dashboard.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔗</div>
            <h3>Grupo integrado ao dashboard</h3>
            <p>Leve só a sua parte das despesas do grupo para o dashboard, com conversão de moeda, e transforme pagamentos recebidos em receita.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📤</div>
            <h3>Exportação em CSV</h3>
            <p>Exporte suas transações em CSV respeitando os filtros ativos, com valor original e câmbio das transações convertidas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📬</div>
            <h3>Resumo por e-mail</h3>
            <p>Receba um resumo semanal e/ou mensal das suas finanças direto no e-mail — é só ativar no perfil.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">↕️</div>
            <h3>Organize do seu jeito</h3>
            <p>Arraste para reordenar transações, contas, metas, orçamentos, eventos, recorrências e grupos — no mouse, no toque ou no teclado.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌗</div>
            <h3>Modo claro e escuro</h3>
            <p>Alterne entre tema claro e escuro quando quiser — a preferência fica salva no seu navegador.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">♿</div>
            <h3>Acessível</h3>
            <p>Navegação completa por teclado e suporte a leitores de tela em todo o app.</p>
          </div>
        </div>
      </section>

      {!isDesktopApp && (
        <section id="desktop" className="download-section">
          <div className="browser-frame">
            <div className="browser-frame-bar">
              <span className="browser-dot browser-dot--red" />
              <span className="browser-dot browser-dot--yellow" />
              <span className="browser-dot browser-dot--green" />
            </div>
            <img
              src={screenshotRelatorio}
              alt="Relatórios do GeldTrack com gráficos de evolução mensal"
              className="download-image"
            />
          </div>
          <div className="download-card">
            <h2>Leve o GeldTrack para o seu desktop</h2>
            <p>Baixe o instalador para Windows, macOS ou Linux e use o GeldTrack como um aplicativo nativo, com os mesmos dados e funcionalidades da versão web.</p>
            <div className="platform-badges">
              <span className="platform-badge">🪟 Windows</span>
              <span className="platform-badge">🍎 macOS</span>
              <span className="platform-badge">🐧 Linux</span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
              >
                <Download size={18} /> Baixar instalador
              </a>
              {canInstall && (
                <button type="button" className="btn btn-outline btn-lg" onClick={promptInstall}>
                  📱 Instalar no celular
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="landing-footer">
        <div className="footer-row">
          <p>💰 GeldTrack</p>
          <a href="https://github.com/itsmariah/geldtrack" target="_blank" rel="noopener noreferrer">Ver no GitHub</a>
        </div>
        <p className="footer-credits">
          Feito por Mariah ·{' '}
          <a href="https://github.com/itsmariah" target="_blank" rel="noopener noreferrer">GitHub</a> ·{' '}
          <a href="https://www.linkedin.com/in/maria-mariah-queiroga-508757182/" target="_blank" rel="noopener noreferrer">LinkedIn</a> ·{' '}
          <a href="https://itsmariah.github.io" target="_blank" rel="noopener noreferrer">Portfólio</a>
        </p>
      </footer>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="back-to-top"
          aria-label="Voltar ao início"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  FileText, Upload, AlertCircle, DollarSign, Calendar, Activity,
  Map, User, CheckCircle, Filter, RefreshCw, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import './Dashboard.css';

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  const [filterMonth, setFilterMonth] = useState('all');
  const [fileUploaded, setFileUploaded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Função para processar o arquivo Excel
  const processExcel = (file) => {
    setLoading(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Processamento de dados
        const processedData = jsonData.map(row => ({
          ...row,
          'data criação': new Date(row['data criação']),
          'data da cirurgia': row['data da cirurgia'] ? new Date(row['data da cirurgia']) : null,
          'data de faturamento': row['data de faturamento'] ? new Date(row['data de faturamento']) : null,
          'vl total faturado': parseFloat(row['vl total faturado'] || 0),
          month: row['data criação'] ? new Date(row['data criação']).getMonth() + 1 : null,
          year: row['data criação'] ? new Date(row['data criação']).getFullYear() : null
        }));
        
        setData(processedData);
        setFilteredData(processedData);
        setFileUploaded(true);
        setLoading(false);
      } catch (err) {
        setError('Erro ao processar o arquivo: ' + err.message);
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Erro ao ler o arquivo');
      setLoading(false);
    };
    
    reader.readAsBinaryString(file);
  };

  // Handler para upload de arquivo
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      processExcel(file);
    }
  };

  // Aplicar filtros
  useEffect(() => {
    if (data.length > 0) {
      let filtered = [...data];
      
      if (filterMonth !== 'all') {
        filtered = filtered.filter(item => item.month === parseInt(filterMonth));
      }
      
      setFilteredData(filtered);
    }
  }, [data, filterMonth]);

  // Calcular procedimentos liberados por mês
  const procedimentosPorMes = useCallback(() => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return months.map(month => {
      const count = filteredData.filter(item => item.month === month).length;
      return {
        name: monthNames[month - 1],
        quantidade: count
      };
    });
  }, [filteredData]);

  // Calcular procedimentos mais liberados por mês/estado
  const procedimentosPorEstado = useCallback(() => {
    const estados = [...new Set(filteredData.map(item => item['uf local da cirurgia']))].filter(Boolean);
    
    const result = estados.map(estado => {
      const procedimentos = filteredData.filter(item => item['uf local da cirurgia'] === estado);
      return {
        estado,
        quantidade: procedimentos.length,
        valor: procedimentos.reduce((sum, item) => sum + (item['vl total faturado'] || 0), 0)
      };
    });
    
    return result.sort((a, b) => b.quantidade - a.quantidade).slice(0, 10);
  }, [filteredData]);

  // Calcular procedimentos por autorizador
  const procedimentosPorAutorizador = useCallback(() => {
    const autorizadores = [...new Set(filteredData.map(item => item['autorizador']))].filter(Boolean);
    
    const result = autorizadores.map(autorizador => {
      const procedimentos = filteredData.filter(item => item['autorizador'] === autorizador);
      return {
        name: autorizador,
        quantidade: procedimentos.length
      };
    });
    
    return result.sort((a, b) => b.quantidade - a.quantidade).slice(0, 5);
  }, [filteredData]);

  // Calcular valor faturado por mês
  const valorFaturadoPorMes = useCallback(() => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return months.map(month => {
      const monthData = filteredData.filter(item => item.month === month);
      const valorFaturado = monthData.reduce((sum, item) => {
        return sum + (item['vl total faturado'] || 0);
      }, 0);
      
      return {
        name: monthNames[month - 1],
        valor: valorFaturado
      };
    });
  }, [filteredData]);

  // Calcular quantidade por validador
  const quantidadePorValidador = useCallback(() => {
    const validadores = [...new Set(filteredData.map(item => item['responsável pela avaliação']))].filter(Boolean);
    
    const result = validadores.map(validador => {
      const count = filteredData.filter(item => item['responsável pela avaliação'] === validador).length;
      return {
        name: validador || 'Não informado',
        value: count
      };
    });
    
    return result.sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredData]);

  // Calcular estatísticas gerais
  const calcularEstatisticas = useCallback(() => {
    const totalProcedimentos = filteredData.length;
    const valorTotalFaturado = filteredData.reduce((sum, item) => sum + (item['vl total faturado'] || 0), 0);
    
    // Valor que falta faturar (procedimentos sem data de faturamento)
    const procedimentosSemFaturamento = filteredData.filter(item => !item['data de faturamento']);
    const valorFaltaFaturar = procedimentosSemFaturamento.length;
    
    // Procedimentos mais comuns
    const procedimentosCount = {};
    filteredData.forEach(item => {
      const descricao = item['descrição procedimento'];
      if (descricao) {
        procedimentosCount[descricao] = (procedimentosCount[descricao] || 0) + 1;
      }
    });
    
    const procedimentosMaisComuns = Object.entries(procedimentosCount)
      .map(([name, value]) => {
        // Criar versão abreviada do nome para exibição no gráfico
        const shortName = name.length > 15 ? name.substring(0, 15) + '...' : name;
        return { 
          name, 
          shortName,
          value,
          fullName: name // Mantém o nome completo para o tooltip
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    return {
      totalProcedimentos,
      valorTotalFaturado,
      valorFaltaFaturar,
      procedimentosMaisComuns
    };
  }, [filteredData]);

  const stats = calcularEstatisticas();

  // Formatador de valor monetário
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{payload[0]?.payload?.fullName || label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes("valor") 
                ? formatCurrency(entry.value) 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Dashboard de Procedimentos Médicos</h1>
            <p>Análise de Desempenho e Gestão Financeira</p>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => document.getElementById('fileInput').click()}
              className="upload-button"
            >
              <Upload className="button-icon" />
              Carregar Arquivo
            </button>
            <input 
              id="fileInput" 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
              className="hidden-input" 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Loading/Error States */}
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        )}
        
        {error && (
          <div className="error-container">
            <div className="error-content">
              <AlertCircle className="error-icon" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {!fileUploaded && !loading && !error && (
          <div className="upload-prompt">
            <FileText className="upload-icon" />
            <h2>Nenhum arquivo carregado</h2>
            <p>Carregue um arquivo Excel para visualizar o dashboard</p>
            <button 
              onClick={() => document.getElementById('fileInput').click()}
              className="upload-button-large"
            >
              <Upload className="button-icon-sm" />
              Selecionar Arquivo
            </button>
          </div>
        )}

        {fileUploaded && !loading && (
          <>
            {/* Filtros */}
            <div className="filters-container">
              <div className="filters-content">
                <div className="filters-title">
                  <Filter className="filter-icon" />
                  <span>Filtros:</span>
                </div>
                <div className="filters-controls">
                  <div className="filter-control">
                    <label>Mês:</label>
                    <select 
                      value={filterMonth} 
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">Todos</option>
                      <option value="1">Janeiro</option>
                      <option value="2">Fevereiro</option>
                      <option value="3">Março</option>
                      <option value="4">Abril</option>
                      <option value="5">Maio</option>
                      <option value="6">Junho</option>
                      <option value="7">Julho</option>
                      <option value="8">Agosto</option>
                      <option value="9">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setFilterMonth('all')}
                    className="clear-filter-button"
                  >
                    <RefreshCw className="refresh-icon" />
                    Limpar
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs-container">
              <div className="tabs-content">
                <nav className="tabs-nav">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                  >
                    Visão Geral
                  </button>
                  <button
                    onClick={() => setActiveTab('procedimentos')}
                    className={`tab-button ${activeTab === 'procedimentos' ? 'active' : ''}`}
                  >
                    Procedimentos
                  </button>
                  <button
                    onClick={() => setActiveTab('financeiro')}
                    className={`tab-button ${activeTab === 'financeiro' ? 'active' : ''}`}
                  >
                    Financeiro
                  </button>
                </nav>
              </div>
            </div>

            {/* Cards */}
            <div className="stats-cards">
              <div className="stat-card blue">
                <div className="card-content">
                  <div>
                    <p className="card-label">Total de Procedimentos</p>
                    <h3 className="card-value">{stats.totalProcedimentos}</h3>
                  </div>
                  <div className="card-icon-container blue">
                    <Activity className="card-icon" />
                  </div>
                </div>
              </div>
              
              <div className="stat-card green">
                <div className="card-content">
                  <div>
                    <p className="card-label">Valor Total Faturado</p>
                    <h3 className="card-value">{formatCurrency(stats.valorTotalFaturado)}</h3>
                  </div>
                  <div className="card-icon-container green">
                    <DollarSign className="card-icon" />
                  </div>
                </div>
              </div>
              
              <div className="stat-card amber">
                <div className="card-content">
                  <div>
                    <p className="card-label">A Faturar</p>
                    <h3 className="card-value">{stats.valorFaltaFaturar}</h3>
                  </div>
                  <div className="card-icon-container amber">
                    <Calendar className="card-icon" />
                  </div>
                </div>
              </div>
              
              <div className="stat-card purple">
                <div className="card-content">
                  <div>
                    <p className="card-label">Média por Procedimento</p>
                    <h3 className="card-value">
                      {stats.totalProcedimentos 
                        ? formatCurrency(stats.valorTotalFaturado / stats.totalProcedimentos) 
                        : formatCurrency(0)}
                    </h3>
                  </div>
                  <div className="card-icon-container purple">
                    <CheckCircle className="card-icon" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="charts-grid">
                {/* Procedimentos por Mês */}
                <div className="chart-container">
                  <h2 className="chart-title">Procedimentos Liberados por Mês</h2>
                  <div className="chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={procedimentosPorMes()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="quantidade" fill="#3B82F6" name="Quantidade" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Valor Faturado por Mês */}
                <div className="chart-container">
                  <h2 className="chart-title">Valor Faturado por Mês</h2>
                  <div className="chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={valorFaturadoPorMes()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="valor" name="Valor (R$)" fill="#10B981" fillOpacity={0.3} stroke="#10B981" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Procedimentos por Estado */}
                <div className="chart-container">
                  <h2 className="chart-title">Procedimentos por Estado</h2>
                  <div className="chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={procedimentosPorEstado()} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="estado" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="quantidade" fill="#8884D8" name="Quantidade" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Quantidade por Validador */}
                <div className="chart-container">
                  <h2 className="chart-title">Quantidade por Validador</h2>
                  <div className="chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={quantidadePorValidador()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {quantidadePorValidador().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'procedimentos' && (
              <div className="charts-grid">
                {/* Procedimentos mais liberados - MODIFICADO */}
                <div className="chart-container">
                  <h2 className="chart-title">Procedimentos Mais Liberados</h2>
                  <div className="chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={stats.procedimentosMaisComuns} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="shortName" 
                          width={50}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 7)}...` : value}
                        />
                        <Tooltip 
                          content={<CustomTooltip />} 
                          cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                        />
                        <Legend />
                        <Bar dataKey="value" fill="#F59E0B" name="Quantidade" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Procedimentos por Autorizador */}
                <div className="chart-container">
                  <h2 className="chart-title">Procedimentos por Autorizador</h2>
                  <div className="chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={procedimentosPorAutorizador()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="quantidade"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {procedimentosPorAutorizador().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'financeiro' && (
              <div className="charts-grid single">
                {/* Valor Faturado vs. Procedimentos */}
                <div className="chart-container">
                  <h2 className="chart-title">Valor Faturado vs. Procedimentos</h2>
                  <div className="chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={valorFaturadoPorMes()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="valor" stroke="#8884d8" name="Valor Faturado (R$)" />
                        <Line yAxisId="right" type="monotone" dataKey="quantidade" stroke="#82ca9d" name="Procedimentos" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <p>Dashboard de Procedimentos Médicos © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
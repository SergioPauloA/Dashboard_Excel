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
      .map(([name, value]) => ({ name, value }))
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
        <div className="bg-white p-4 border rounded shadow-lg">
          <p className="font-semibold">{label}</p>
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard de Procedimentos Médicos</h1>
            <p className="mt-1 text-blue-100">Análise de Desempenho e Gestão Financeira</p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => document.getElementById('fileInput').click()}
              className="flex items-center bg-white text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition"
            >
              <Upload className="w-5 h-5 mr-2" />
              Carregar Arquivo
            </button>
            <input 
              id="fileInput" 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Loading/Error States */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {!fileUploaded && !loading && !error && (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Nenhum arquivo carregado</h2>
            <p className="text-gray-500 mb-6">Carregue um arquivo Excel para visualizar o dashboard</p>
            <button 
              onClick={() => document.getElementById('fileInput').click()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Upload className="w-5 h-5 inline mr-2" />
              Selecionar Arquivo
            </button>
          </div>
        )}

        {fileUploaded && !loading && (
          <>
            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between">
                <div className="flex items-center">
                  <Filter className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="font-medium text-gray-700">Filtros:</span>
                </div>
                <div className="flex flex-wrap items-center space-x-4">
                  <div className="flex items-center">
                    <label className="mr-2 text-gray-600">Mês:</label>
                    <select 
                      value={filterMonth} 
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="border rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Limpar
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-4 px-6 font-medium text-sm inline-flex items-center ${
                      activeTab === 'overview'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Visão Geral
                  </button>
                  <button
                    onClick={() => setActiveTab('procedimentos')}
                    className={`py-4 px-6 font-medium text-sm inline-flex items-center ${
                      activeTab === 'procedimentos'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Procedimentos
                  </button>
                  <button
                    onClick={() => setActiveTab('financeiro')}
                    className={`py-4 px-6 font-medium text-sm inline-flex items-center ${
                      activeTab === 'financeiro'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Financeiro
                  </button>
                </nav>
              </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total de Procedimentos</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalProcedimentos}</h3>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Valor Total Faturado</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(stats.valorTotalFaturado)}</h3>
                  </div>
                  <div className="bg-green-100 p-2 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">A Faturar</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.valorFaltaFaturar}</h3>
                  </div>
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <Calendar className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Média por Procedimento</p>
                    <h3 className="text-2xl font-bold text-gray-800 mt-1">
                      {stats.totalProcedimentos 
                        ? formatCurrency(stats.valorTotalFaturado / stats.totalProcedimentos) 
                        : formatCurrency(0)}
                    </h3>
                  </div>
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Procedimentos por Mês */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Procedimentos Liberados por Mês</h2>
                  <div className="h-80">
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
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Valor Faturado por Mês</h2>
                  <div className="h-80">
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
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Procedimentos por Estado</h2>
                  <div className="h-80">
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
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Quantidade por Validador</h2>
                  <div className="h-80">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Procedimentos mais liberados */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Procedimentos Mais Liberados</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={stats.procedimentosMaisComuns} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={140} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="value" fill="#F59E0B" name="Quantidade" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Procedimentos por Autorizador */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Procedimentos por Autorizador</h2>
                  <div className="h-80">
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
              <div className="grid grid-cols-1 gap-6 mb-8">
                {/* Valor Faturado vs. Procedimentos */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Valor Faturado vs. Procedimentos</h2>
                  <div className="h-80">
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
      <footer className="bg-gray-800 text-gray-300 p-6 mt-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center">Dashboard de Procedimentos Médicos © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
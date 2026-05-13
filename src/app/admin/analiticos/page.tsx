'use client'


import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import dynamic from 'next/dynamic'
import { BackButton } from '@/components/BackButton'
import { ConsuldataFooter } from '@/components/ConsuldataFooter'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

interface ChecklistData {
  id: string; status: string; created_at: string; closed_at: string | null
  departure_km_final: number | null; arrival_km_final: number | null
  departure_lat_final: number | null; departure_lng_final: number | null
  arrival_lat_final: number | null; arrival_lng_final: number | null
  departure_items: Array<{ status: string }> | null
  arrival_occurrences: Array<unknown> | null
  vehicle: { id: string; plate: string; model: string } | null
  user: { id: string; name: string; email: string } | null
}

type DateRange = 'today' | 'week' | 'month' | 'year' | 'custom'

function getDateRange(range: DateRange, from?: string, to?: string): { from: Date; to: Date } {
  const now = new Date()
  const toDate = to ? new Date(to + 'T23:59:59') : new Date(now)
  toDate.setHours(23, 59, 59, 999)
  switch (range) {
    case 'today': { const f = new Date(now); f.setHours(0,0,0,0); return { from: f, to: toDate } }
    case 'week':  { const f = new Date(now); f.setDate(now.getDate()-6); f.setHours(0,0,0,0); return { from: f, to: toDate } }
    case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: toDate }
    case 'year':  return { from: new Date(now.getFullYear(), 0, 1), to: toDate }
    case 'custom': return { from: from ? new Date(from+'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1), to: toDate }
  }
}

function getVehicle(c: ChecklistData) { return Array.isArray(c.vehicle) ? c.vehicle[0] : c.vehicle }
function getUser(c: ChecklistData) { return Array.isArray(c.user) ? c.user[0] : c.user }
function hasNok(c: ChecklistData) {
  return (c.departure_items ?? []).some(i => i.status === 'nok') || (c.arrival_occurrences ?? []).length > 0
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<ChecklistData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('all')
  const [filterDriver, setFilterDriver] = useState('all')
  const [vehicles, setVehicles] = useState<{id:string;plate:string}[]>([])
  const [drivers, setDrivers] = useState<{id:string;name:string}[]>([])
  const [searchQuestion, setSearchQuestion] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchHistory, setSearchHistory] = useState<{q:string;a:string}[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const supabase = createClient()
    const [checkRes, vehRes, drvRes] = await Promise.all([
      supabase.from('checklists').select('id,status,created_at,closed_at,departure_km_final,arrival_km_final,departure_lat_final,departure_lng_final,arrival_lat_final,arrival_lng_final,departure_items,arrival_occurrences,vehicle:vehicles(id,plate,model),user:users(id,name,email)').order('created_at',{ascending:false}).limit(500),
      supabase.from('vehicles').select('id,plate').eq('active',true).order('plate'),
      supabase.from('users').select('id,name').eq('role','driver').order('name'),
    ])
    if (checkRes.data) setData(checkRes.data as unknown as ChecklistData[])
    if (vehRes.data) setVehicles(vehRes.data)
    if (drvRes.data) setDrivers(drvRes.data)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const { from, to } = getDateRange(dateRange, customFrom, customTo)
    return data.filter(c => {
      const date = new Date(c.created_at)
      if (date < from || date > to) return false
      if (filterVehicle !== 'all' && getVehicle(c)?.id !== filterVehicle) return false
      if (filterDriver !== 'all' && getUser(c)?.id !== filterDriver) return false
      return true
    })
  }, [data, dateRange, customFrom, customTo, filterVehicle, filterDriver])

  const kpis = useMemo(() => ({
    total: filtered.length,
    closed: filtered.filter(c => c.status === 'closed').length,
    open: filtered.filter(c => c.status === 'open').length,
    withNok: filtered.filter(hasNok).length,
    totalKm: filtered.reduce((s,c) => { const d=c.departure_km_final??0,a=c.arrival_km_final??0; return s+(a>d?a-d:0) }, 0),
  }), [filtered])

  const byDay = useMemo(() => {
    const map: Record<string,{date:string;realizados:number;pendencias:number}> = {}
    filtered.forEach(c => {
      const d = new Date(c.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})
      if (!map[d]) map[d] = {date:d,realizados:0,pendencias:0}
      map[d].realizados++
      if (hasNok(c)) map[d].pendencias++
    })
    return Object.values(map).slice(-30)
  }, [filtered])

  const statusPie = useMemo(() => [
    {name:'Concluídas',value:kpis.closed,color:'#35bc7a'},
    {name:'Em aberto',value:kpis.open,color:'#ff9f00'},
    {name:'Com pendência',value:kpis.withNok,color:'#f05a49'},
  ].filter(d => d.value > 0), [kpis])

  const vehicleRanking = useMemo(() => {
    const map: Record<string,{plate:string;km:number;trips:number}> = {}
    filtered.forEach(c => {
      const v = getVehicle(c); if(!v) return
      if (!map[v.id]) map[v.id] = {plate:v.plate,km:0,trips:0}
      const d=c.departure_km_final??0,a=c.arrival_km_final??0
      if(a>d) map[v.id].km+=a-d
      map[v.id].trips++
    })
    return Object.values(map).sort((a,b)=>b.km-a.km).slice(0,8)
  }, [filtered])

  const driverRanking = useMemo(() => {
    const map: Record<string,{name:string;km:number;trips:number}> = {}
    filtered.forEach(c => {
      const u = getUser(c); if(!u) return
      if (!map[u.id]) map[u.id] = {name:u.name,km:0,trips:0}
      const d=c.departure_km_final??0,a=c.arrival_km_final??0
      if(a>d) map[u.id].km+=a-d
      map[u.id].trips++
    })
    return Object.values(map).sort((a,b)=>b.km-a.km).slice(0,8)
  }, [filtered])

  const pendingByVehicle = useMemo(() => {
    const map: Record<string,{plate:string;pending:number;total:number}> = {}
    filtered.forEach(c => {
      const v = getVehicle(c); if(!v) return
      if (!map[v.id]) map[v.id] = {plate:v.plate,pending:0,total:0}
      map[v.id].total++
      if(hasNok(c)) map[v.id].pending++
    })
    return Object.values(map).filter(v=>v.pending>0).sort((a,b)=>b.pending-a.pending)
  }, [filtered])

  const mapPoints = useMemo(() => {
    const pts: Array<{lat:number;lng:number;type:'departure'|'arrival';plate:string}> = []
    filtered.forEach(c => {
      const plate = getVehicle(c)?.plate ?? '?'
      if(c.departure_lat_final&&c.departure_lng_final) pts.push({lat:c.departure_lat_final,lng:c.departure_lng_final,type:'departure',plate})
      if(c.arrival_lat_final&&c.arrival_lng_final) pts.push({lat:c.arrival_lat_final,lng:c.arrival_lng_final,type:'arrival',plate})
    })
    return pts
  }, [filtered])

  const card: React.CSSProperties = {background:'#fff',border:'1px solid #dddddd',borderRadius:14,boxShadow:'0 1px 3px rgba(0,0,0,0.06)',padding:'16px 18px'}
  const ttStyle = {fontFamily:"'Open Sans', sans-serif",fontSize:12,borderRadius:8,border:'1px solid #dddddd'}

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQuestion.trim()
    if (!q || searchLoading) return
    setSearchLoading(true)
    try {
      const res = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) })
      const data = await res.json()
      setSearchHistory(prev => [{ q, a: data.answer }, ...prev])
      setSearchQuestion('')
      setTimeout(() => searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch { setSearchHistory(prev => [{ q, a: 'Erro ao processar a busca. Tente novamente.' }, ...prev]) }
    setSearchLoading(false)
  }

  return (
    <main style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'#ebeff2',paddingBottom:80}}>
      <header style={{background:'#212771',padding:'0 20px',position:'sticky',top:0,zIndex:40}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:56,position:'relative'}}>
          <img src="/LOGO_CONSULDATA.png" alt="Consuldata" style={{ height: 36, width: 'auto', objectFit: 'contain' }} /><span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:18,fontWeight:800,color:'#fff',position:'absolute',left:'50%',transform:'translateX(-50%)',whiteSpace:'nowrap'}}>
            FLEET<span style={{color:'#f86924'}}>CHECK</span>
            <span style={{fontSize:12,fontWeight:400,color:'rgba(255,255,255,0.5)',marginLeft:6}}>Analytics</span>
          </span>
          <button onClick={()=>router.push('/admin')} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'rgba(255,255,255,0.85)',fontSize:11,fontWeight:700,padding:'5px 12px',borderRadius:6,cursor:'pointer'}}>← Painel</button>
        </div>
      </header>

      {/* Filters */}
      <div style={{background:'#fff',borderBottom:'1px solid #dddddd',padding:'12px 16px'}}>
        <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
          {([{key:'today',label:'Hoje'},{key:'week',label:'7 dias'},{key:'month',label:'Mês'},{key:'year',label:'Ano'},{key:'custom',label:'Personalizado'}] as const).map(({key,label})=>(
            <button key={key} onClick={()=>setDateRange(key)}
              style={{padding:'6px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',background:dateRange===key?'#212771':'#ebeff2',color:dateRange===key?'#fff':'#5e6673',border:`1px solid ${dateRange===key?'#212771':'#dddddd'}`,fontFamily:"'Open Sans', sans-serif"}}>
              {label}
            </button>
          ))}
        </div>
        {dateRange==='custom'&&(
          <div style={{display:'flex',gap:8,marginBottom:10}}>
            <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1.5px solid #dddddd',fontSize:13,color:'#555',fontFamily:"'Open Sans', sans-serif",colorScheme:'light'}}/>
            <span style={{alignSelf:'center',color:'#5e6673',fontSize:13}}>até</span>
            <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1.5px solid #dddddd',fontSize:13,color:'#555',fontFamily:"'Open Sans', sans-serif",colorScheme:'light'}}/>
          </div>
        )}
        <div style={{display:'flex',gap:8}}>
          <select value={filterVehicle} onChange={e=>setFilterVehicle(e.target.value)} style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1.5px solid #dddddd',fontSize:13,color:'#555',fontFamily:"'Open Sans', sans-serif",background:'#fff'}}>
            <option value="all">Todos os veículos</option>
            {vehicles.map(v=><option key={v.id} value={v.id}>{v.plate}</option>)}
          </select>
          <select value={filterDriver} onChange={e=>setFilterDriver(e.target.value)} style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1.5px solid #dddddd',fontSize:13,color:'#555',fontFamily:"'Open Sans', sans-serif",background:'#fff'}}>
            <option value="all">Todos os motoristas</option>
            {drivers.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div className="spin" style={{width:36,height:36,borderRadius:'50%',border:'3px solid #dddddd',borderTopColor:'#f86924'}}/>
        </div>
      ) : (
        <div style={{padding:'16px',display:'flex',flexDirection:'column',gap:16,maxWidth:900,width:'100%',margin:'0 auto'}}>

          {/* KPI Cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
            {[
              {label:'Total',value:kpis.total,color:'#212771',icon:'📋'},
              {label:'Concluídas',value:kpis.closed,color:'#35bc7a',icon:'✅'},
              {label:'Em aberto',value:kpis.open,color:'#ff9f00',icon:'🚗'},
              {label:'Com pendência',value:kpis.withNok,color:'#f05a49',icon:'⚠️'},
            ].map(({label,value,color,icon})=>(
              <div key={label} style={{...card,textAlign:'center',padding:'18px 12px'}}>
                <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
                <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:36,fontWeight:800,color,lineHeight:1}}>{value}</div>
                <div style={{fontSize:11,fontWeight:700,color:'#5e6673',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:4}}>{label}</div>
              </div>
            ))}
          </div>

          {/* KM total */}
          {kpis.totalKm>0&&(
            <div style={{...card,display:'flex',alignItems:'center',gap:16}}>
              <div style={{fontSize:28}}>🛣️</div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#5e6673',textTransform:'uppercase',letterSpacing:'0.06em'}}>KM total rodado no período</div>
                <div style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:32,fontWeight:800,color:'#212771'}}>{kpis.totalKm.toLocaleString('pt-BR')} km</div>
              </div>
            </div>
          )}

          {/* Bar: por dia */}
          {byDay.length>0&&(
            <div style={card}>
              <p style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:18,fontWeight:800,color:'#212771',marginBottom:14}}>📈 Checklists por dia</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byDay} margin={{top:4,right:4,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="date" tick={{fontSize:11,fill:'#5e6673'}}/>
                  <YAxis tick={{fontSize:11,fill:'#5e6673'}} allowDecimals={false}/>
                  <Tooltip contentStyle={ttStyle}/>
                  <Bar dataKey="realizados" name="Realizados" fill="#212771" radius={[4,4,0,0]}/>
                  <Bar dataKey="pendencias" name="Com pendência" fill="#f86924" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie: status */}
          {statusPie.length>0&&(
            <div style={card}>
              <p style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:18,fontWeight:800,color:'#212771',marginBottom:14}}>🥧 Distribuição de status</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value"
                    label={({name,percent})=>`${name} ${((percent??0)*100).toFixed(0)}%`} labelLine={false} style={{fontSize:11}}>
                    {statusPie.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={ttStyle}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ranking veículos */}
          {vehicleRanking.length>0&&(
            <div style={card}>
              <p style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:18,fontWeight:800,color:'#212771',marginBottom:14}}>🚗 Ranking veículos — KM rodado</p>
              <ResponsiveContainer width="100%" height={Math.max(160,vehicleRanking.length*44)}>
                <BarChart data={vehicleRanking} layout="vertical" margin={{top:0,right:56,left:10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:11,fill:'#5e6673'}} tickFormatter={v=>`${v.toLocaleString('pt-BR')}`}/>
                  <YAxis type="category" dataKey="plate" width={72} tick={{fontSize:13,fontWeight:700,fill:'#212771',fontFamily:"'Barlow Condensed', sans-serif"}}/>
                  <Tooltip formatter={(v)=>[`${Number(v).toLocaleString('pt-BR')} km`,'KM rodado']} contentStyle={ttStyle}/>
                  <Bar dataKey="km" fill="#f86924" radius={[0,4,4,0]} label={{position:'right',fontSize:11,fill:'#5e6673',formatter:(v: unknown)=>Number(v)>0?`${Number(v).toLocaleString('pt-BR')} km`:''}}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ranking motoristas */}
          {driverRanking.length>0&&(
            <div style={card}>
              <p style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:18,fontWeight:800,color:'#212771',marginBottom:14}}>👤 Ranking motoristas — KM rodado</p>
              <ResponsiveContainer width="100%" height={Math.max(160,driverRanking.length*44)}>
                <BarChart data={driverRanking} layout="vertical" margin={{top:0,right:56,left:10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:11,fill:'#5e6673'}} tickFormatter={v=>`${v.toLocaleString('pt-BR')}`}/>
                  <YAxis type="category" dataKey="name" width={80} tick={{fontSize:12,fill:'#555',fontFamily:"'Open Sans', sans-serif"}}/>
                  <Tooltip formatter={(v)=>[`${Number(v).toLocaleString('pt-BR')} km`,'KM rodado']} contentStyle={ttStyle}/>
                  <Bar dataKey="km" fill="#212771" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pendências por veículo */}
          {pendingByVehicle.length>0&&(
            <div style={card}>
              <p style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:18,fontWeight:800,color:'#212771',marginBottom:14}}>⚠️ Pendências por veículo</p>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {pendingByVehicle.map((v,i)=>(
                  <div key={v.plate} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'#ebeff2',borderRadius:10}}>
                    <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:16,fontWeight:800,color:'#212771',minWidth:28}}>#{i+1}</span>
                    <span style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:17,fontWeight:700,color:'#212771',flex:1}}>{v.plate}</span>
                    <div style={{textAlign:'right'}}>
                      <span style={{fontSize:11,color:'#f05a49',fontWeight:700,background:'rgba(240,90,73,0.1)',padding:'3px 10px',borderRadius:12}}>
                        {v.pending} pendência{v.pending>1?'s':''}
                      </span>
                      <p style={{fontSize:10,color:'#5e6673',marginTop:2}}>{v.total} check{v.total>1?'s':''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mapa */}
          {mapPoints.length>0&&(
            <div style={card}>
              <p style={{fontFamily:"'Barlow Condensed', sans-serif",fontSize:18,fontWeight:800,color:'#212771',marginBottom:10}}>🗺️ Mapa de saídas e chegadas</p>
              <div style={{display:'flex',gap:16,marginBottom:10}}>
                <span style={{fontSize:12,display:'flex',alignItems:'center',gap:4}}>
                  <span style={{width:10,height:10,borderRadius:'50%',background:'#212771',display:'inline-block'}}/> Saída ({mapPoints.filter(p=>p.type==='departure').length})
                </span>
                <span style={{fontSize:12,display:'flex',alignItems:'center',gap:4}}>
                  <span style={{width:10,height:10,borderRadius:'50%',background:'#35bc7a',display:'inline-block'}}/> Chegada ({mapPoints.filter(p=>p.type==='arrival').length})
                </span>
              </div>
              <div style={{borderRadius:12,overflow:'hidden',height:320,border:'1px solid #dddddd'}}>
                <MapView points={mapPoints}/>
              </div>
            </div>
          )}

          {filtered.length===0&&(
            <div style={{...card,textAlign:'center',padding:'48px 20px'}}>
              <p style={{fontSize:32,marginBottom:8}}>📭</p>
              <p style={{fontSize:15,color:'#5e6673'}}>Nenhum checklist encontrado para os filtros selecionados.</p>
            </div>
          )}
        </div>
      )}
      <ConsuldataFooter/>
      <BackButton href="/admin" label="Voltar para o painel"/>
    </main>
  )
}

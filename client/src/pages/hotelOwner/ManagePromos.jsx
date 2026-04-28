import React, { useEffect, useState } from 'react'
import Title from '../../components/Title'
import { useAppContext } from '../../context/AppContext'
import toast from 'react-hot-toast'

const ManagePromos = () => {
  const { axios, getToken } = useAppContext()
  const [promos, setPromos] = useState([])
  const [form, setForm] = useState({ code: '', discountPercent: '', maxUses: '', expiresAt: '' })
  const [loading, setLoading] = useState(false)

  const fetchPromos = async () => {
    const { data } = await axios.get('/api/promos', { headers: { Authorization: `Bearer ${await getToken()}` } })
    if (data.success) setPromos(data.promos)
  }

  const createPromo = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await axios.post('/api/promos', form, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (data.success) { toast.success('Promo created!'); setForm({ code: '', discountPercent: '', maxUses: '', expiresAt: '' }); fetchPromos() }
      else toast.error(data.message)
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const deletePromo = async (id) => {
    if (!window.confirm('Delete this promo?')) return
    const { data } = await axios.delete(`/api/promos/${id}`, { headers: { Authorization: `Bearer ${await getToken()}` } })
    if (data.success) { toast.success('Deleted'); fetchPromos() }
    else toast.error(data.message)
  }

  useEffect(() => { fetchPromos() }, [])

  return (
    <div>
      <Title align='left' font='outfit' title='Promo Codes' subTitle='Create and manage discount codes for your guests.'/>

      <form onSubmit={createPromo} className='mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl'>
        <div>
          <label className='text-sm text-gray-600'>Code</label>
          <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
            placeholder='e.g. SUMMER20' required
            className='mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none uppercase'/>
        </div>
        <div>
          <label className='text-sm text-gray-600'>Discount %</label>
          <input value={form.discountPercent} onChange={e => setForm({...form, discountPercent: e.target.value})}
            type='number' min='1' max='100' placeholder='e.g. 20' required
            className='mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none'/>
        </div>
        <div>
          <label className='text-sm text-gray-600'>Max Uses <span className='text-gray-400'>(optional)</span></label>
          <input value={form.maxUses} onChange={e => setForm({...form, maxUses: e.target.value})}
            type='number' min='1' placeholder='Unlimited'
            className='mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none'/>
        </div>
        <div>
          <label className='text-sm text-gray-600'>Expires <span className='text-gray-400'>(optional)</span></label>
          <input value={form.expiresAt} onChange={e => setForm({...form, expiresAt: e.target.value})}
            type='date' min={new Date().toISOString().split('T')[0]}
            className='mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none'/>
        </div>
        <button type='submit' disabled={loading}
          className='sm:col-span-2 lg:col-span-4 bg-primary text-white py-2 rounded text-sm cursor-pointer disabled:opacity-60 hover:bg-primary-dull transition-all'>
          {loading ? 'Creating...' : 'Create Promo Code'}
        </button>
      </form>

      <div className='mt-8 max-w-3xl border border-gray-300 rounded-lg overflow-hidden'>
        <table className='w-full text-sm text-left'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-4 py-3 text-gray-700 font-medium'>Code</th>
              <th className='px-4 py-3 text-gray-700 font-medium'>Discount</th>
              <th className='px-4 py-3 text-gray-700 font-medium max-sm:hidden'>Uses</th>
              <th className='px-4 py-3 text-gray-700 font-medium max-sm:hidden'>Expires</th>
              <th className='px-4 py-3 text-gray-700 font-medium'>Status</th>
              <th className='px-4 py-3'></th>
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 && (
              <tr><td colSpan={6} className='px-4 py-6 text-center text-gray-400'>No promo codes yet</td></tr>
            )}
            {promos.map(p => {
              const expired = p.expiresAt && new Date(p.expiresAt) < new Date()
              const maxed = p.maxUses !== null && p.usedCount >= p.maxUses
              const active = p.isActive && !expired && !maxed
              return (
                <tr key={p._id} className='border-t border-gray-200'>
                  <td className='px-4 py-3 font-mono font-medium'>{p.code}</td>
                  <td className='px-4 py-3 text-green-600 font-medium'>{p.discountPercent}%</td>
                  <td className='px-4 py-3 text-gray-500 max-sm:hidden'>{p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ' / ∞'}</td>
                  <td className='px-4 py-3 text-gray-500 max-sm:hidden'>{p.expiresAt ? new Date(p.expiresAt).toDateString() : '—'}</td>
                  <td className='px-4 py-3'>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                      {active ? 'Active' : expired ? 'Expired' : maxed ? 'Maxed' : 'Inactive'}
                    </span>
                  </td>
                  <td className='px-4 py-3'>
                    <button onClick={() => deletePromo(p._id)} className='text-red-400 hover:text-red-600 text-xs cursor-pointer'>Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ManagePromos

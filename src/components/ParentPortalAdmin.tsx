"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Vote, FileText, Plus, UserPlus, FileUp } from "lucide-react";
import { createElection, getElections, addCandidate, createHolidayWork, getHolidayWorks } from "@/lib/services";
import { School, Class, Stream, Student } from "@/lib/types";

export function ElectionsManager({ school, students }: { school: School, students: Student[] }) {
  const [elections, setElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Election
  const [newTitle, setNewTitle] = useState("");
  
  // Add Candidate
  const [selectedElectionId, setSelectedElectionId] = useState("");
  const [candStudentId, setCandStudentId] = useState("");
  const [candPosition, setCandPosition] = useState("");
  const [candManifesto, setCandManifesto] = useState("");

  const loadData = async () => {
    setLoading(true);
    const data = await getElections(school.id);
    setElections(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [school.id]);

  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    const tid = toast.loading("Creating election...");
    try {
      await createElection(school.id, newTitle, school.currentTerm, school.currentYear);
      toast.success("Election created!", { id: tid });
      setNewTitle("");
      loadData();
    } catch(err) {
      toast.error("Failed to create", { id: tid });
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedElectionId || !candStudentId || !candPosition) return;
    const tid = toast.loading("Adding candidate...");
    try {
      await addCandidate(selectedElectionId, candStudentId, candPosition, candManifesto);
      toast.success("Candidate registered!", { id: tid });
      setCandStudentId(""); setCandPosition(""); setCandManifesto("");
      loadData();
    } catch(err) {
      toast.error("Failed to add", { id: tid });
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)" }}><Vote /> Manage Elections</h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Create Election */}
        <div className="card">
          <h4 style={{ marginBottom: "15px" }}>Create New Election</h4>
          <form onSubmit={handleCreateElection}>
            <div className="form-group">
              <label className="form-label">Election Title</label>
              <input type="text" className="input-field" placeholder="e.g. 2026 Prefect Elections" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
            </div>
            <button className="btn btn-primary" style={{ width: "100%", padding: "10px" }}><Plus size={16}/> Create Event</button>
          </form>
        </div>

        {/* Add Candidate */}
        <div className="card">
          <h4 style={{ marginBottom: "15px" }}>Register Candidate</h4>
          <form onSubmit={handleAddCandidate}>
            <div className="form-group">
              <label className="form-label">Select Election</label>
              <select className="input-field" value={selectedElectionId} onChange={e => setSelectedElectionId(e.target.value)} required>
                <option value="">-- Choose Election --</option>
                {elections.map(el => <option key={el.id} value={el.id}>{el.title}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Select Student</label>
              <select className="input-field" value={candStudentId} onChange={e => setCandStudentId(e.target.value)} required>
                <option value="">-- Search Student --</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentNumber})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Position (e.g. Head Boy)</label>
              <input type="text" className="input-field" value={candPosition} onChange={e => setCandPosition(e.target.value)} required />
            </div>
            <button className="btn btn-primary" style={{ width: "100%", padding: "10px", background: "var(--success)" }}><UserPlus size={16}/> Add Candidate</button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <h4 style={{ marginBottom: "15px" }}>Active Elections</h4>
        {loading ? <p>Loading...</p> : elections.length === 0 ? <p>No elections found.</p> : (
          <table className="table">
            <thead><tr><th>Title</th><th>Status</th><th>Candidates</th></tr></thead>
            <tbody>
              {elections.map(el => (
                <tr key={el.id}>
                  <td>{el.title}</td>
                  <td><span className="badge badge-success">{el.status}</span></td>
                  <td>{el.candidates?.length || 0} Registered</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function HolidayWorkManager({ school, classes, streams }: { school: School, classes: Class[], streams: Stream[] }) {
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [clsId, setClsId] = useState("");
  const [strId, setStrId] = useState("");

  const loadData = async () => {
    setLoading(true);
    const data = await getHolidayWorks(school.id);
    setWorks(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [school.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!title || !clsId) return;
    const tid = toast.loading("Publishing assignment...");
    try {
      await createHolidayWork(school.id, clsId, strId || null, title, desc, school.currentTerm, school.currentYear);
      toast.success("Assignment Published!", { id: tid });
      setTitle(""); setDesc("");
      loadData();
    } catch(err) {
      toast.error("Failed to publish", { id: tid });
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)" }}><FileText /> Holiday Assignments</h3>
      </div>

      <div className="card" style={{ marginBottom: "20px" }}>
        <h4 style={{ marginBottom: "15px" }}>Create New Assignment</h4>
        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Assignment Title</label>
            <input type="text" className="input-field" value={title} onChange={e=>setTitle(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Target Class</label>
            <select className="input-field" value={clsId} onChange={e=>setClsId(e.target.value)} required>
              <option value="">-- Select Class --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Target Stream (Optional)</label>
            <select className="input-field" value={strId} onChange={e=>setStrId(e.target.value)}>
              <option value="">-- All Streams --</option>
              {streams.filter(s => s.classId === clsId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Instructions / Description</label>
            <input type="text" className="input-field" value={desc} onChange={e=>setDesc(e.target.value)} required />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn btn-primary" style={{ width: "100%", padding: "10px" }}><FileUp size={16}/> Publish Assignment to Parent Portal</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: "15px" }}>Active Assignments</h4>
        {loading ? <p>Loading...</p> : works.length === 0 ? <p>No assignments found.</p> : (
          <table className="table">
            <thead><tr><th>Title</th><th>Class</th><th>Submissions</th></tr></thead>
            <tbody>
              {works.map(w => (
                <tr key={w.id}>
                  <td>{w.title}</td>
                  <td>{w.class?.name} {w.stream?.name || "(All Streams)"}</td>
                  <td>{w.submissions?.length || 0} Uploaded</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

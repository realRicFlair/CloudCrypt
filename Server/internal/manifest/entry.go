package manifest

import "time"

type Entry struct {
	Name    string   `json:"name"`           // plaintext visible only after decrypting manifest
	Enc     string   `json:"enc"`            // slug (random filename) used on disk (dir name or file name, hex)
	Type    string   `json:"type"`           // "file" | "dir"
	Size    int64    `json:"size,omitempty"` // plaintext size (files)
	Created int64    `json:"created,omitempty"`
	ModTime int64    `json:"mod_time,omitempty"`
	Tags    []string `json:"tags,omitempty"`
}

type Manifest struct {
	Version int     `json:"version"`
	Entries []Entry `json:"entries"`
}

func NewManifest() *Manifest {
	return &Manifest{
		Version: 1,
		Entries: []Entry{},
	}
}

func (m *Manifest) FindEntry(name, typ string) (int, *Entry) {
	for i := range m.Entries {
		if m.Entries[i].Name == name && (typ == "" || m.Entries[i].Type == typ) {
			return i, &m.Entries[i]
		}
	}
	return -1, nil
}

func (m *Manifest) AddEntry(name, enc, typ string) *Entry {
	now := time.Now().Unix()
	e := Entry{
		Name:    name,
		Enc:     enc,
		Type:    typ,
		Created: now,
		ModTime: now,
	}
	m.Entries = append(m.Entries, e)
	return &m.Entries[len(m.Entries)-1]
}

import { useContext, useState } from 'react';
import './App.css'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import React from 'react';
import FileIcon from "./assets/file.svg?react";
import FolderIcon from "./assets/folder.svg?react";
import FolderOpenIcon from "./assets/folder-open.svg?react";

type MyFile = {
  type: 'file',
  name: string;
  content: string;
  filepath: string;
  accessPath: string[];
};

type RecursiveDirs = {
  type: 'dir';
  name: string;
  fulldirname: string;
  contents: {
    [name: string]: MyFile | RecursiveDirs | undefined;
  }
}

type Filegroup = {
  id: string;
  title?: string;
  fileStructure: RecursiveDirs;
}

// const FileGroupsCont = React.createContext('light');

// const getAllKeysForLevel = (dir: RecursiveDirs): { sortKey: string, pathKey: string[], isDir: boolean }[] => {
//   return Object.values(dir.subdirs).reduce((acc, dir) => {
//     return [...acc, { sortKey: dir.fulldirname, isDir: true, pathKey: [] }];
//   }, dir.files.map(f => ({ sortKey: f.filepath, pathKey: f.filepathParts, isDir: false })));
// }

function getFileContents(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = function (e) {
      if (e.target) {
        resolve(String(e.target.result))
      }
      reject('Error reading file')
    }
    reader.onerror = function (e) {
      reject(e)
    }
    reader.readAsText(file)
  })
}

const FileGroupContext = React.createContext<{
  fileGroups: Filegroup[],
  comparingFgs: Record<string, boolean | undefined>
  comparingFiles: [MyFile, MyFile] | null,
  expandedDirs: Record<string, boolean>,
  setExpandedDirs: (arg: string) => void,
  setComparingFiles: (arg: [MyFile, MyFile] | null) => void,
}>({
  fileGroups: [],
  comparingFgs: {},
  comparingFiles: null,
  expandedDirs: {},
  setExpandedDirs: () => { },
  setComparingFiles: () => { }
});

const dirId = (fg: Filegroup, dir: RecursiveDirs) => `${fg.id}-${dir.fulldirname}`;

{/* {fg.fileStructure.map((f) => {
                    

                    return (
                      <li >
                        <div >
                          {f.name}
                        </div>
                      </li>
                    );
                  })} */}

const getFileFromFileStructure = (path: string[], dir: RecursiveDirs): MyFile | undefined => {
  const parts = path.slice();
  let current: RecursiveDirs | MyFile | undefined = dir;
  while (parts.length && current?.type === 'dir') {
    current = current.contents[parts.pop()!];
  }

  if (!current || current.type === 'dir') {
    return undefined;
  }

  return current;
}

function Dir(props: { fg: Filegroup, dir: RecursiveDirs, level: number }) {
  const { fileGroups, comparingFgs, comparingFiles, expandedDirs, setExpandedDirs, setComparingFiles } = useContext(FileGroupContext);

  return (
    Object.values(props.dir.contents).slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
      const leftPad = `${props.level * 16}px`;

      if (!c) {
        return <></>;
      }

      if (c.type === 'dir') {
        return (
          <>
            <div onClick={() => setExpandedDirs(dirId(props.fg, c))} style={{ paddingLeft: leftPad }}>{c.name + '/'}</div>
            {expandedDirs[dirId(props.fg, c)] ? (
              <Dir fg={props.fg} dir={c} level={props.level + 1} />
            ) : null}
          </>
        )
      }

      const otherFg = (() => {
        const [id] = Object.entries(comparingFgs).filter(([k, v]) => v && k !== props.fg.id).map(([k, v]) => k) as [string | undefined];
        return id === undefined ? null : {
          index: fileGroups.findIndex(_fg => _fg.id === id),
          value: fileGroups.find(_fg => _fg.id === id)
        }
      })();

      const isBeingCompared = otherFg?.value && !!comparingFgs[props.fg.id];
      const sisterFileInOtherFg = otherFg?.value && getFileFromFileStructure(c.accessPath, otherFg.value.fileStructure);
      console.log({ file: c.name, path: c.accessPath, thisFG: props.fg, otherFG: otherFg?.value, sisterFileInOtherFg });
      const fileDiffers = isBeingCompared && c.content !== sisterFileInOtherFg?.content;
      const fileDoesntExist = isBeingCompared && !sisterFileInOtherFg;
      const fgIndex = fileGroups.findIndex(fg => fg.id === props.fg.id);

      const color = (() => {
        if (fileDoesntExist) {
          return 'red';
        }
        if (fileDiffers) {
          return 'yellow';
        }
        return 'white';
      })();

      return (
        <div
          title={c.filepath}
          style={{ paddingLeft: leftPad, color }}
          onClick={() => {
            if (!isBeingCompared || !sisterFileInOtherFg || !fileDiffers) {
              return;
            }

            const isLaterFG = fgIndex > otherFg.index;
            if (isLaterFG) {
              setComparingFiles([sisterFileInOtherFg, c]);
            } else {
              setComparingFiles([c, sisterFileInOtherFg]);
            }
          }}>
          {c.name}
        </div>
      );
    })
  );
}



function App() {
  const [fileGroups, setFileGroups] = useState<Filegroup[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const [comparingFgs, setComparingFgs] = useState<Record<string, boolean | undefined>>({});
  const [comparingFiles, setComparingFiles] = useState<[MyFile, MyFile] | null>(null);

  return (
    <>
      <FileGroupContext.Provider value={{
        fileGroups,
        comparingFgs,
        comparingFiles,
        expandedDirs,
        setExpandedDirs: (id: string) => setExpandedDirs({ ...expandedDirs, [id]: !expandedDirs[id] }),
        setComparingFiles: (arg: [MyFile, MyFile] | null) => setComparingFiles(arg),
      }}>
        <header>
          <h1>
            multidiffer.io
          </h1>
          <h3>
            diff entire folders
          </h3>
        </header>
        {Object.entries(comparingFgs).map(([k, v]) => <p>{k}={String(v)}</p>)}
        <main>
          <div className='main--top-drawer'>
            <div className='filegroup-list'>
              {fileGroups.map((fg) => (
                <div className='filegroup' style={{ border: comparingFgs[fg.id] ? '1px solid red' : '1px solid white' }}>
                  {!fg.title ? null : <h3>{fg.title}</h3>}
                  <div className='compare-btn'>
                    <input type="checkbox" defaultChecked={comparingFgs[fg.id]} onChange={(e) => {
                      setComparingFgs({ ...comparingFgs, [fg.id]: !comparingFgs[fg.id] });
                      setComparingFiles(null);
                    }} />
                    compare
                  </div>
                  {/* <button onClick={() => {
                  document.getElementById(`addFilesInput-${fg.id}`)?.click();
                }}> Add more files</button>
                <input id={`addFilesInput-${fg.id}`} type="file" multiple style={{ display: 'none' }} onChange={async (e) => {
                  if (!e.target.files) {
                    return;
                  }
                  const newFiles = [...e.target.files].filter(f => fg.files.every(fgf => fgf.name !== f.name))
                  const readFiles: Files = await Promise.all(newFiles.map(async (f) => {
                    const contents = await getFileContents(f);
                    return {
                      name: f.name,
                      content: contents
                    }
                  }));

                  const newFileGroup: Filegroup = { ...fg, files: [...fg.files, ...readFiles] };
                  setFileGroups(fileGroups.map(fg => fg.id === newFileGroup.id ? newFileGroup : fg))
                }} /> */}
                  <ul>
                    <Dir fg={fg} dir={fg.fileStructure} level={0} />

                  </ul>
                </div>
              ))}
            </div>

            <div className='upload-btn'>
              {/* <button onClick={() => {
              document.getElementById('newFileGroupInput')?.click();
            }}> add individual files</button>
            <input id="newFileGroupInput" style={{ display: 'none' }} type="file" multiple onChange={async (e) => {
              if (!e.target.files || e.target.files.length === 0) {
                return;
              }

              const files = [...e.target.files];
              console.log(files)

              const readFiles: Files = await Promise.all(files.map(async (f) => {
                const contents = await getFileContents(f);
                return {
                  name: f.name,
                  content: contents
                }
              }));

              setFileGroups([...fileGroups, { id: crypto.randomUUID(), title: `Group #${fileGroups.length + 1}`, files: readFiles }])
            }} /> */}
              <button onClick={() => {
                document.getElementById('newFileGroupDirInput')?.click();
              }}>
                add single folder
                <div className='single-folder-depiction'>
                  <FolderIcon />
                </div>
              </button>
              <input id="newFileGroupDirInput" webkitdirectory="true" style={{ display: 'none' }} type="file" multiple onChange={async (e) => {
                if (!e.target.files || e.target.files.length === 0) {
                  return;
                }

                const files = [...e.target.files];

                const dirs = files.reduce((acc, f) => {
                  let path = f.webkitRelativePath;
                  while (path) {
                    path = path.split('/').slice(0, -1).join('/');
                    if (path && !acc.includes(path)) {
                      acc.push(path);
                    }
                  }
                  return acc;
                }, [] as string[]);

                let fileStructure = dirs.slice().sort().reduce((acc, d) => {
                  let parts = d.split('/');
                  let curdir = acc;
                  let fulldirpath = [];

                  while (parts.length) {
                    const dname = parts.shift()!;
                    fulldirpath.push(dname);
                    if (!curdir.contents[dname]) {
                      const newDir: RecursiveDirs = { name: dname, fulldirname: fulldirpath.join('/'), contents: {}, type: 'dir' };
                      curdir.contents[dname] = newDir;
                    }
                    curdir = curdir.contents[dname] as RecursiveDirs;
                  }

                  return acc;
                }, { fulldirname: '', contents: {}, type: 'dir' } as RecursiveDirs);

                const rootContents = Object.values(fileStructure.contents);
                const singularRoot = rootContents.length === 1 && rootContents[0]!.type === 'dir' ? rootContents[0] : undefined;

                if (singularRoot) {
                  fileStructure = singularRoot
                }

                await Promise.all(files.map(async (f) => {
                  const contents = await getFileContents(f);

                  const file: MyFile = {
                    name: f.name,
                    type: 'file',
                    content: contents,
                    filepath: f.webkitRelativePath,
                    accessPath: f.webkitRelativePath.split("/").filter(p => p !== singularRoot?.name)
                  };

                  const savePath = f.webkitRelativePath.split("/").slice(0, -1).filter(p => p !== singularRoot?.name);
                  let parentdir = fileStructure;
                  while (savePath.length) {
                    const dname = savePath.shift()!;
                    parentdir = parentdir.contents[dname] as RecursiveDirs;
                  }
                  parentdir.contents[file.name] = file;
                }));

                console.log({ files })
                console.log({ dirs })
                console.log({ fileStructure })

                setFileGroups([...fileGroups, { id: crypto.randomUUID(), title: singularRoot?.name ?? `Group #${fileGroups.length + 1}`, fileStructure }])
              }} />
            </div>

            <div className='upload-btn' onClick={() => {
              document.getElementById('newRootMultiFileGroupDirInput')?.click();
            }}>
              <button>
                add all sub folders
              </button>
              <input id="newRootMultiFileGroupDirInput" webkitdirectory="true" style={{ display: 'none' }} type="file" multiple onChange={async (e) => {
                if (!e.target.files || e.target.files.length === 0) {
                  return;
                }

                const files = [...e.target.files];

                const dirs = files.reduce((acc, f) => {
                  let path = f.webkitRelativePath;
                  while (path) {
                    path = path.split('/').slice(0, -1).join('/');
                    if (path && !acc.includes(path)) {
                      acc.push(path);
                    }
                  }
                  return acc;
                }, [] as string[]);

                let fileStructure = dirs.slice().sort().reduce((acc, d) => {
                  let parts = d.split('/');
                  let curdir = acc;
                  let fulldirpath = [];

                  while (parts.length) {
                    const dname = parts.shift()!;
                    fulldirpath.push(dname);
                    if (!curdir.contents[dname]) {
                      const newDir: RecursiveDirs = { name: dname, fulldirname: fulldirpath.join('/'), contents: {}, type: 'dir' };
                      curdir.contents[dname] = newDir;
                    }
                    curdir = curdir.contents[dname] as RecursiveDirs;
                  }

                  return acc;
                }, { fulldirname: '', contents: {}, type: 'dir' } as RecursiveDirs);

                const rootContents = Object.values(fileStructure.contents);
                const singularRoot = rootContents.length === 1 && rootContents[0]!.type === 'dir' ? rootContents[0] : undefined;

                if (singularRoot) {
                  fileStructure = singularRoot
                }

                await Promise.all(files.map(async (f) => {
                  const contents = await getFileContents(f);

                  const file: MyFile = {
                    name: f.name,
                    type: 'file',
                    content: contents,
                    filepath: f.webkitRelativePath,
                    accessPath: f.webkitRelativePath.split("/").filter(p => p !== singularRoot?.name)
                  };

                  const savePath = f.webkitRelativePath.split("/").slice(0, -1).filter(p => p !== singularRoot?.name);
                  let parentdir = fileStructure;
                  while (savePath.length) {
                    const dname = savePath.shift()!;
                    parentdir = parentdir.contents[dname] as RecursiveDirs;
                  }
                  parentdir.contents[file.name] = file;
                }));

                console.log({ files })
                console.log({ dirs })
                console.log({ fileStructure })

                setFileGroups([...fileGroups, { id: crypto.randomUUID(), title: singularRoot?.name ?? `Group #${fileGroups.length + 1}`, fileStructure }])
              }} />
              <div className='multi-folder-depiction'>
                <div className='parent'>
                  <FolderOpenIcon />
                </div>
                <div className='children'>
                  <div className='start-line'></div>
                  <div className='folder-line'></div>
                  <div className='end-line end-line-1'></div>
                  <div className='end-line end-line-2'></div>
                  <div className='end-line end-line-3'></div>
                  <FolderIcon />
                  <FolderIcon />
                  <FolderIcon />
                </div>
              </div>
            </div>
          </div>
          {!comparingFiles ? null : <div className='main--bottom-drawer'>
            <ReactDiffViewer
              compareMethod={DiffMethod.LINES}
              oldValue={comparingFiles[0].content}
              newValue={comparingFiles[1].content}
              splitView={true} />
          </div>}
        </main>
      </FileGroupContext.Provider>
    </>
  )
}

export default App

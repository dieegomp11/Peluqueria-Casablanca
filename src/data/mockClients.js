// User requested premium UI rules:
// - [CMD: /color-vibrant] #0f172a, #38bdf8
// - [CMD: /glass] 'backdrop-blur-md bg-white/10 border border-white/20' (I should adapt to the light theme: 'backdrop-blur-md bg-black/5 border border-black/10' or just stick to the premium white/grey we've been using, wait, user rules globally say:
// - [CMD: /color-vibrant]: Usa una paleta con contrastes altos, fondos #0f172a y acentos #38bdf8.
// - [CMD: /color-minimal]: Usa una paleta nórdica (blancos puros #ffffff, grises suaves #f8fafc y texto #1e293b).
// Since the app is currently in /color-minimal style (white, #f8fafc, black #000000, gray-500 #6b7280), I will stay with minimal but apply the glass and shadow-premium where needed.

export const mockClients = [
  { id: 1, name: 'Carlos Martínez', phone: '600 123 456', lastVisit: '2026-03-22', visitsMonth: 3, visitsYear: 12 },
  { id: 2, name: 'Javier Ruíz', phone: '611 222 333', lastVisit: '2026-03-23', visitsMonth: 1, visitsYear: 8 },
  { id: 3, name: 'Miguel Ángel (Hijo)', phone: '622 333 444', lastVisit: '2026-03-23', visitsMonth: 2, visitsYear: 15 },
  { id: 4, name: 'Antonio García', phone: '633 444 555', lastVisit: '2026-03-23', visitsMonth: 1, visitsYear: 5 },
  { id: 5, name: 'Alejandro Sanz', phone: '644 555 666', lastVisit: '2026-03-23', visitsMonth: 4, visitsYear: 20 },
  { id: 6, name: 'Alberto Gómez', phone: '655 666 777', lastVisit: '2026-03-23', visitsMonth: 1, visitsYear: 4 },
  { id: 7, name: 'Luis Torres', phone: '677 888 999', lastVisit: '2026-03-24', visitsMonth: 2, visitsYear: 9 },
  { id: 8, name: 'Pedro Gómez', phone: '699 000 111', lastVisit: '2026-03-24', visitsMonth: 1, visitsYear: 7 },
  { id: 9, name: 'Arturo Vidal', phone: '655 123 987', lastVisit: '2026-03-24', visitsMonth: 3, visitsYear: 18 },
  { id: 10, name: 'Manuel Díaz', phone: '600 999 888', lastVisit: '2026-03-21', visitsMonth: 1, visitsYear: 6 },
  { id: 11, name: 'Daniel Herrero', phone: '612 345 678', lastVisit: '2026-02-15', visitsMonth: 0, visitsYear: 3 },
  { id: 12, name: 'Omar Suárez', phone: '698 765 432', lastVisit: '2026-03-10', visitsMonth: 1, visitsYear: 11 },
  { id: 13, name: 'Karim Benzema', phone: '601 202 303', lastVisit: '2026-01-20', visitsMonth: 0, visitsYear: 2 },
  { id: 14, name: 'Saíd Fernández', phone: '634 567 890', lastVisit: '2026-03-18', visitsMonth: 1, visitsYear: 8 },
  { id: 15, name: 'Hugo Silva', phone: '645 678 901', lastVisit: '2026-03-05', visitsMonth: 2, visitsYear: 14 }
];

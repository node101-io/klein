let scrollP = 0;

const loading = {
  show() { 
    scrollP = window.scrollY;
    document.querySelector('.all-wrapper').classList.add('display-none');
    document.querySelector('.loading-boxes').classList.remove('display-none');  
  },
  hide() {
    document.querySelector('.loading-boxes').classList.add('display-none');
    document.querySelector('.all-wrapper').classList.remove('display-none');
    window.scrollTo(0, scrollP);
  }
};
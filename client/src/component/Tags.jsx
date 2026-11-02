
const Tags = ({filter, type1, type2,setFilter ,setShowCat=()=>{}, showCat=false}) =>{
    return(
        <>
            <div className={`tag-wrap tag-wrap${showCat &&'-active'}`}>
            { type1.map((item)=>{
                return(
                    <div className={`tag-button tag-button${filter === item.name?"-active":""}`}>
                        <p onClick={()=>{setFilter(item.name);setShowCat(false)}}>{item.name}</p>
                    </div>
                )
                })}
            {/* { type2.map((item)=>{
                return(
                    <div className={`tag-button tag-button${filter === item.name?"-active":""}`}>
                        <p onClick={()=>{setFilter(item.name)}}>{item.name}</p>
                    </div>
                )
                })} */}
            </div>
        </>
    )
}

export default Tags;